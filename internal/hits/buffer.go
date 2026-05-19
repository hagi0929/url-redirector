package hits

import (
	"sync"

	"github.com/hagi0929/url-redirector/internal/redirect"
)

type Buffer struct {
	mu    sync.Mutex
	items []redirect.HitEvent
	cap   int
	idx   int
	full  bool
}

func New(cap int) *Buffer {
	if cap <= 0 {
		cap = 200
	}
	return &Buffer{items: make([]redirect.HitEvent, cap), cap: cap}
}

func (b *Buffer) Push(ev redirect.HitEvent) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.items[b.idx] = ev
	b.idx++
	if b.idx >= b.cap {
		b.idx = 0
		b.full = true
	}
}

func (b *Buffer) Recent(limit int) []redirect.HitEvent {
	b.mu.Lock()
	defer b.mu.Unlock()
	size := b.idx
	if b.full {
		size = b.cap
	}
	if limit <= 0 || limit > size {
		limit = size
	}
	out := make([]redirect.HitEvent, 0, limit)
	start := b.idx - 1
	if start < 0 {
		start = b.cap - 1
	}
	for i := 0; i < limit; i++ {
		pos := start - i
		if pos < 0 {
			pos += b.cap
		}
		out = append(out, b.items[pos])
	}
	return out
}
