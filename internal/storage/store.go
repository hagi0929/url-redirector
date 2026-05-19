package storage

import (
	"encoding/json"
	"errors"
	"path/filepath"
	"os"
	"time"

	bolt "go.etcd.io/bbolt"

	"github.com/hagi0929/url-redirector/internal/redirect"
)

var (
	ErrNotFound      = errors.New("redirect not found")
	ErrAlreadyExists = errors.New("redirect already exists")
)

var bucketName = []byte("redirects")

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
		_, err := tx.CreateBucketIfNotExists(bucketName)
		return err
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
		v := tx.Bucket(bucketName).Get([]byte(slug))
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
		return tx.Bucket(bucketName).ForEach(func(_, v []byte) error {
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
	err := s.db.Update(func(tx *bolt.Tx) error {
		b := tx.Bucket(bucketName)
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
		b := tx.Bucket(bucketName)
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

func (s *Store) Delete(slug string) error {
	return s.db.Update(func(tx *bolt.Tx) error {
		b := tx.Bucket(bucketName)
		if b.Get([]byte(slug)) == nil {
			return ErrNotFound
		}
		return b.Delete([]byte(slug))
	})
}

func (s *Store) IncrementHit(slug string) error {
	return s.db.Update(func(tx *bolt.Tx) error {
		b := tx.Bucket(bucketName)
		v := b.Get([]byte(slug))
		if v == nil {
			return ErrNotFound
		}
		var r redirect.Redirect
		if err := json.Unmarshal(v, &r); err != nil {
			return err
		}
		r.HitCount++
		data, err := json.Marshal(r)
		if err != nil {
			return err
		}
		return b.Put([]byte(slug), data)
	})
}
