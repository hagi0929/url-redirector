package storage

import (
	"encoding/binary"
	"encoding/json"
	"time"

	bolt "go.etcd.io/bbolt"

	"github.com/hagi0929/url-redirector/internal/redirect"
)

var hitLogBucket = []byte("hit_log")

const HitLogRetention = 30 * 24 * time.Hour

type HitLogFilter struct {
	Slug        string
	Country     string
	Since       time.Time
	Until       time.Time
	Limit       int
}

func (s *Store) appendHitLog(tx *bolt.Tx, ev redirect.HitEvent) error {
	b, err := tx.CreateBucketIfNotExists(hitLogBucket)
	if err != nil {
		return err
	}
	seq, err := b.NextSequence()
	if err != nil {
		return err
	}
	key := make([]byte, 16)
	binary.BigEndian.PutUint64(key[:8], uint64(ev.At.UnixNano()))
	binary.BigEndian.PutUint64(key[8:], seq)
	data, err := json.Marshal(ev)
	if err != nil {
		return err
	}
	return b.Put(key, data)
}

func (s *Store) PruneHitLog(retention time.Duration) (int, error) {
	cutoff := time.Now().UTC().Add(-retention).UnixNano()
	var removed int
	err := s.db.Update(func(tx *bolt.Tx) error {
		b := tx.Bucket(hitLogBucket)
		if b == nil {
			return nil
		}
		c := b.Cursor()
		for k, _ := c.First(); k != nil; k, _ = c.First() {
			ts := int64(binary.BigEndian.Uint64(k[:8]))
			if ts >= cutoff {
				return nil
			}
			if err := c.Delete(); err != nil {
				return err
			}
			removed++
		}
		return nil
	})
	return removed, err
}

func (s *Store) HitLog(filter HitLogFilter) ([]redirect.HitEvent, error) {
	out := []redirect.HitEvent{}
	limit := filter.Limit
	if limit <= 0 {
		limit = 500
	}
	var startKey, endKey []byte
	if !filter.Since.IsZero() {
		startKey = make([]byte, 16)
		binary.BigEndian.PutUint64(startKey[:8], uint64(filter.Since.UnixNano()))
	}
	if !filter.Until.IsZero() {
		endKey = make([]byte, 16)
		binary.BigEndian.PutUint64(endKey[:8], uint64(filter.Until.UnixNano()))
	}
	err := s.db.View(func(tx *bolt.Tx) error {
		b := tx.Bucket(hitLogBucket)
		if b == nil {
			return nil
		}
		c := b.Cursor()
		var k, v []byte
		if endKey != nil {
			k, v = c.Seek(endKey)
			if k == nil {
				k, v = c.Last()
			} else {
				k, v = c.Prev()
			}
		} else {
			k, v = c.Last()
		}
		for ; k != nil; k, v = c.Prev() {
			if startKey != nil && lessThan(k, startKey) {
				break
			}
			var ev redirect.HitEvent
			if err := json.Unmarshal(v, &ev); err != nil {
				continue
			}
			if filter.Slug != "" && ev.Slug != filter.Slug {
				continue
			}
			if filter.Country != "" && ev.CountryCode != filter.Country {
				continue
			}
			out = append(out, ev)
			if len(out) >= limit {
				break
			}
		}
		return nil
	})
	return out, err
}

func (s *Store) GeoAggregate(filter HitLogFilter) (map[string]int64, error) {
	out := map[string]int64{}
	var startKey []byte
	if !filter.Since.IsZero() {
		startKey = make([]byte, 16)
		binary.BigEndian.PutUint64(startKey[:8], uint64(filter.Since.UnixNano()))
	}
	err := s.db.View(func(tx *bolt.Tx) error {
		b := tx.Bucket(hitLogBucket)
		if b == nil {
			return nil
		}
		c := b.Cursor()
		var k, v []byte
		if startKey != nil {
			k, v = c.Seek(startKey)
		} else {
			k, v = c.First()
		}
		for ; k != nil; k, v = c.Next() {
			if !filter.Until.IsZero() {
				ts := int64(binary.BigEndian.Uint64(k[:8]))
				if ts > filter.Until.UnixNano() {
					break
				}
			}
			var ev redirect.HitEvent
			if err := json.Unmarshal(v, &ev); err != nil {
				continue
			}
			if filter.Slug != "" && ev.Slug != filter.Slug {
				continue
			}
			code := ev.CountryCode
			if code == "" {
				code = "??"
			}
			out[code]++
		}
		return nil
	})
	return out, err
}

func lessThan(a, b []byte) bool {
	for i := 0; i < len(a) && i < len(b); i++ {
		if a[i] != b[i] {
			return a[i] < b[i]
		}
	}
	return len(a) < len(b)
}
