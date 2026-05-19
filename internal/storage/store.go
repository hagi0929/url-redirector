package storage

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sort"
	"time"

	bolt "go.etcd.io/bbolt"

	"github.com/hagi0929/url-redirector/internal/redirect"
)

var (
	ErrNotFound      = errors.New("redirect not found")
	ErrAlreadyExists = errors.New("redirect already exists")
)

var (
	redirectsBucket = []byte("redirects")
	metricsBucket   = []byte("metrics")
)

const (
	maxDailyBuckets    = 30
	maxHourlyBuckets   = 48
	maxReferrerEntries = 50
)

type Store struct {
	db *bolt.DB
}

func Open(path string) (*Store, error) {
	if dir := filepath.Dir(path); dir != "" && dir != "." {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return nil, err
		}
	}
	db, err := bolt.Open(path, 0o600, &bolt.Options{Timeout: 2 * time.Second})
	if err != nil {
		return nil, err
	}
	if err := db.Update(func(tx *bolt.Tx) error {
		if _, err := tx.CreateBucketIfNotExists(redirectsBucket); err != nil {
			return err
		}
		if _, err := tx.CreateBucketIfNotExists(metricsBucket); err != nil {
			return err
		}
		if _, err := tx.CreateBucketIfNotExists(hitLogBucket); err != nil {
			return err
		}
		return nil
	}); err != nil {
		_ = db.Close()
		return nil, err
	}
	return &Store{db: db}, nil
}

func (s *Store) Close() error { return s.db.Close() }

func (s *Store) Get(slug string) (redirect.Redirect, error) {
	var r redirect.Redirect
	err := s.db.View(func(tx *bolt.Tx) error {
		v := tx.Bucket(redirectsBucket).Get([]byte(slug))
		if v == nil {
			return ErrNotFound
		}
		return json.Unmarshal(v, &r)
	})
	return r, err
}

func (s *Store) List() ([]redirect.Redirect, error) {
	out := []redirect.Redirect{}
	err := s.db.View(func(tx *bolt.Tx) error {
		return tx.Bucket(redirectsBucket).ForEach(func(_, v []byte) error {
			var r redirect.Redirect
			if err := json.Unmarshal(v, &r); err != nil {
				return err
			}
			out = append(out, r)
			return nil
		})
	})
	return out, err
}

func (s *Store) Create(r redirect.Redirect) (redirect.Redirect, error) {
	now := time.Now().UTC()
	r.CreatedAt = now
	r.UpdatedAt = now
	r.HitCount = 0
	r.LastAccessed = time.Time{}
	err := s.db.Update(func(tx *bolt.Tx) error {
		b := tx.Bucket(redirectsBucket)
		if b.Get([]byte(r.Slug)) != nil {
			return ErrAlreadyExists
		}
		data, err := json.Marshal(r)
		if err != nil {
			return err
		}
		return b.Put([]byte(r.Slug), data)
	})
	return r, err
}

func (s *Store) Update(slug, target string, status int) (redirect.Redirect, error) {
	var r redirect.Redirect
	err := s.db.Update(func(tx *bolt.Tx) error {
		b := tx.Bucket(redirectsBucket)
		v := b.Get([]byte(slug))
		if v == nil {
			return ErrNotFound
		}
		if err := json.Unmarshal(v, &r); err != nil {
			return err
		}
		if target != "" {
			r.TargetURL = target
		}
		if status != 0 {
			r.StatusCode = status
		}
		r.UpdatedAt = time.Now().UTC()
		data, err := json.Marshal(r)
		if err != nil {
			return err
		}
		return b.Put([]byte(slug), data)
	})
	return r, err
}

func (s *Store) SetFavorite(slug string, favorite bool) (redirect.Redirect, error) {
	var r redirect.Redirect
	err := s.db.Update(func(tx *bolt.Tx) error {
		b := tx.Bucket(redirectsBucket)
		v := b.Get([]byte(slug))
		if v == nil {
			return ErrNotFound
		}
		if err := json.Unmarshal(v, &r); err != nil {
			return err
		}
		r.Favorite = favorite
		r.UpdatedAt = time.Now().UTC()
		data, err := json.Marshal(r)
		if err != nil {
			return err
		}
		return b.Put([]byte(slug), data)
	})
	return r, err
}

func (s *Store) Delete(slug string) error {
	return s.db.Update(func(tx *bolt.Tx) error {
		b := tx.Bucket(redirectsBucket)
		if b.Get([]byte(slug)) == nil {
			return ErrNotFound
		}
		if err := b.Delete([]byte(slug)); err != nil {
			return err
		}
		return tx.Bucket(metricsBucket).Delete([]byte(slug))
	})
}

func (s *Store) RecordHit(ev redirect.HitEvent) error {
	return s.db.Update(func(tx *bolt.Tx) error {
		rb := tx.Bucket(redirectsBucket)
		key := []byte(ev.Slug)
		rv := rb.Get(key)
		if rv == nil {
			return ErrNotFound
		}
		var r redirect.Redirect
		if err := json.Unmarshal(rv, &r); err != nil {
			return err
		}
		r.HitCount++
		r.LastAccessed = ev.At
		rdata, err := json.Marshal(r)
		if err != nil {
			return err
		}
		if err := rb.Put(key, rdata); err != nil {
			return err
		}

		mb := tx.Bucket(metricsBucket)
		mv := mb.Get(key)
		var m redirect.Metrics
		if mv == nil {
			m = redirect.NewMetrics(ev.Slug)
		} else if err := json.Unmarshal(mv, &m); err != nil {
			return err
		}
		applyHit(&m, ev)
		mdata, err := json.Marshal(m)
		if err != nil {
			return err
		}
		if err := mb.Put(key, mdata); err != nil {
			return err
		}
		return s.appendHitLog(tx, ev)
	})
}

func (s *Store) Rename(oldSlug, newSlug string) (redirect.Redirect, error) {
	var r redirect.Redirect
	if oldSlug == newSlug {
		return s.Get(oldSlug)
	}
	err := s.db.Update(func(tx *bolt.Tx) error {
		rb := tx.Bucket(redirectsBucket)
		v := rb.Get([]byte(oldSlug))
		if v == nil {
			return ErrNotFound
		}
		if rb.Get([]byte(newSlug)) != nil {
			return ErrAlreadyExists
		}
		if err := json.Unmarshal(v, &r); err != nil {
			return err
		}
		r.Slug = newSlug
		r.UpdatedAt = time.Now().UTC()
		data, err := json.Marshal(r)
		if err != nil {
			return err
		}
		if err := rb.Put([]byte(newSlug), data); err != nil {
			return err
		}
		if err := rb.Delete([]byte(oldSlug)); err != nil {
			return err
		}
		mb := tx.Bucket(metricsBucket)
		if mv := mb.Get([]byte(oldSlug)); mv != nil {
			var m redirect.Metrics
			if err := json.Unmarshal(mv, &m); err != nil {
				return err
			}
			m.Slug = newSlug
			md, err := json.Marshal(m)
			if err != nil {
				return err
			}
			if err := mb.Put([]byte(newSlug), md); err != nil {
				return err
			}
			if err := mb.Delete([]byte(oldSlug)); err != nil {
				return err
			}
		}
		return nil
	})
	return r, err
}

func (s *Store) Metrics(slug string) (redirect.Metrics, error) {
	m := redirect.NewMetrics(slug)
	err := s.db.View(func(tx *bolt.Tx) error {
		v := tx.Bucket(metricsBucket).Get([]byte(slug))
		if v == nil {
			if r := tx.Bucket(redirectsBucket).Get([]byte(slug)); r == nil {
				return ErrNotFound
			}
			return nil
		}
		return json.Unmarshal(v, &m)
	})
	return m, err
}

func applyHit(m *redirect.Metrics, ev redirect.HitEvent) {
	if m.DailyHits == nil {
		m.DailyHits = map[string]int64{}
	}
	if m.HourlyHits == nil {
		m.HourlyHits = map[string]int64{}
	}
	if m.Browsers == nil {
		m.Browsers = map[string]int64{}
	}
	if m.OSes == nil {
		m.OSes = map[string]int64{}
	}
	if m.Referrers == nil {
		m.Referrers = map[string]int64{}
	}
	if m.Countries == nil {
		m.Countries = map[string]int64{}
	}
	m.LastAccessed = ev.At
	day := ev.At.UTC().Format("2006-01-02")
	hour := ev.At.UTC().Format("2006-01-02T15")
	m.DailyHits[day]++
	m.HourlyHits[hour]++
	if ev.Browser != "" {
		m.Browsers[ev.Browser]++
	}
	if ev.OS != "" {
		m.OSes[ev.OS]++
	}
	if ev.Referrer != "" {
		m.Referrers[ev.Referrer]++
	}
	if ev.CountryCode != "" {
		m.Countries[ev.CountryCode]++
	}
	pruneOldestKey(m.DailyHits, maxDailyBuckets)
	pruneOldestKey(m.HourlyHits, maxHourlyBuckets)
	pruneTopN(m.Referrers, maxReferrerEntries)
}

func pruneOldestKey(m map[string]int64, keep int) {
	if len(m) <= keep {
		return
	}
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for i := 0; i < len(keys)-keep; i++ {
		delete(m, keys[i])
	}
}

func pruneTopN(m map[string]int64, keep int) {
	if len(m) <= keep {
		return
	}
	type kv struct {
		k string
		v int64
	}
	arr := make([]kv, 0, len(m))
	for k, v := range m {
		arr = append(arr, kv{k, v})
	}
	sort.Slice(arr, func(i, j int) bool { return arr[i].v > arr[j].v })
	for i := keep; i < len(arr); i++ {
		delete(m, arr[i].k)
	}
}
