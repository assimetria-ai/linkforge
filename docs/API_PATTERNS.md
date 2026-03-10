# API Patterns Guide

This template includes reusable utilities and middleware for common API patterns: **pagination**, **search**, and **CRUD operations**.

## Quick Start

```javascript
const { pagination } = require('../lib/@system/Middleware')
const {
  handleList,
  handleGetById,
  handleCreate,
  handleUpdate,
  handleDelete,
  createCrudRouter,
} = require('../lib/@system/Helpers')
```

---

## 1. Pagination

### Middleware

Use the `pagination()` middleware to parse query parameters automatically:

```javascript
const router = express.Router()
const { pagination } = require('../lib/@system/Middleware')

router.get('/api/posts', pagination(), async (req, res) => {
  // req.pagination contains: { limit, offset, page }
  const posts = await postsRepo.findAll({
    limit: req.pagination.limit,
    offset: req.pagination.offset,
  })
  
  res.json(formatPaginatedResponse(posts, total, req.pagination))
})
```

### Query Parameters

- `?limit=20` - Items per page (default: 20, max: 100)
- `?offset=40` - Skip this many items
- `?page=3` - Page number (alternative to offset)

### Response Format

```json
{
  "data": [...],
  "total": 150,
  "limit": 20,
  "offset": 40,
  "page": 3,
  "total_pages": 8,
  "has_more": true
}
```

### Custom Configuration

```javascript
// Allow up to 200 items per page
pagination({ maxLimit: 200, defaultLimit: 50 })

// Allow ?limit=-1 to fetch all
pagination({ allowAll: true })
```

---

## 2. Search

### Parse Search Queries

```javascript
const { parseSearchQuery, buildSearchCondition } = require('../lib/@system/Helpers')

router.get('/api/posts', async (req, res) => {
  const search = parseSearchQuery(req.query, {
    defaultFields: ['title', 'content', 'author'],
  })
  
  // search = { query: 'javascript', fields: ['title', 'content'], isEmpty: false }
})
```

### Build Search Conditions (PostgreSQL)

```javascript
const { buildSearchCondition } = require('../lib/@system/Helpers')

const { condition, params } = buildSearchCondition(
  'react hooks',
  ['title', 'description'],
  { mode: 'contains' }  // 'contains' | 'starts_with' | 'exact'
)

// condition: "(LOWER(title) ILIKE ? OR LOWER(description) ILIKE ?)"
// params: ['%react hooks%', '%react hooks%']
```

### Build Complete WHERE Clause

```javascript
const { buildWhereClause } = require('../lib/@system/Helpers')

const { whereClause, params } = buildWhereClause({
  searchQuery: 'javascript',
  searchFields: ['title', 'content'],
  filters: {
    status: 'published',
    author_id: 123,
    tags: ['tutorial', 'beginner'],  // IN clause
  },
})

// WHERE (LOWER(title) ILIKE ? OR LOWER(content) ILIKE ?) AND status = ? AND author_id = ? AND tags IN (?, ?)
```

### Build ORDER BY Clause

```javascript
const { buildOrderByClause } = require('../lib/@system/Helpers')

const orderBy = buildOrderByClause({
  sortBy: req.query.sort,         // Field from query
  sortOrder: req.query.order,      // 'asc' or 'desc'
  allowedFields: ['title', 'created_at', 'views'],
  defaultSort: 'created_at',
})

// ORDER BY created_at DESC
```

---

## 3. CRUD Helpers

### Individual Handlers

Import CRUD handlers and use them in your routes:

```javascript
const { handleList, handleGetById, handleCreate, handleUpdate, handleDelete } = require('../lib/@system/Helpers')
const postsRepo = require('../repositories/posts')

// LIST - GET /api/posts
router.get('/api/posts', pagination(), (req, res, next) => {
  handleList({
    repo: postsRepo,
    req,
    res,
    next,
    filters: { status: 'published' },  // Optional filters
    dataKey: 'posts',                   // Response key (default: 'data')
  })
})

// GET BY ID - GET /api/posts/:id
router.get('/api/posts/:id', (req, res, next) => {
  handleGetById({
    repo: postsRepo,
    req,
    res,
    next,
    notFoundMessage: 'Post not found',
  })
})

// CREATE - POST /api/posts
router.post('/api/posts', validate(createPostSchema), (req, res, next) => {
  handleCreate({
    repo: postsRepo,
    req,
    res,
    next,
    transformData: async (body, req) => ({
      ...body,
      author_id: req.user.id,  // Add author from auth
    }),
  })
})

// UPDATE - PATCH /api/posts/:id
router.patch('/api/posts/:id', validate(updatePostSchema), (req, res, next) => {
  handleUpdate({
    repo: postsRepo,
    req,
    res,
    next,
    transformData: async (body, req, existing) => ({
      ...existing,
      ...body,
      updated_at: new Date(),
    }),
  })
})

// DELETE - DELETE /api/posts/:id
router.delete('/api/posts/:id', (req, res, next) => {
  handleDelete({
    repo: postsRepo,
    req,
    res,
    next,
    hardDelete: false,  // Soft delete (if repo supports softDelete method)
  })
})
```

### Auto-Generated CRUD Router

Create a full CRUD API with one function:

```javascript
const { createCrudRouter } = require('../lib/@system/Helpers')
const postsRepo = require('../repositories/posts')
const { authenticate } = require('../lib/@system/Helpers')

const postsRouter = createCrudRouter({
  repo: postsRepo,
  
  validation: {
    create: createPostSchema,
    update: updatePostSchema,
  },
  
  middleware: {
    create: [authenticate],
    update: [authenticate],
    delete: [authenticate, requireAdmin],
  },
  
  config: {
    basePath: '/api/posts',
    dataKey: 'post',
    messages: {
      notFound: 'Post not found',
      deleted: 'Post deleted successfully',
    },
  },
})

app.use(postsRouter)
```

**Generated routes:**
- `GET /api/posts` - List with pagination
- `GET /api/posts/:id` - Get by ID
- `POST /api/posts` - Create
- `PATCH /api/posts/:id` - Update
- `DELETE /api/posts/:id` - Delete

---

## 4. Repository Interface

CRUD helpers expect repositories to implement these methods:

```javascript
class PostsRepository {
  // Required for list
  async findAll({ limit, offset, ...filters }) {
    // Return array of items
  }
  
  async count(filters) {
    // Return total count
  }
  
  // Required for get
  async findById(id) {
    // Return item or null
  }
  
  // Required for create
  async create(data) {
    // Return created item
  }
  
  // Required for update
  async update(id, data) {
    // Return updated item
  }
  
  // Required for delete
  async delete(id) {
    // Hard delete
  }
  
  // Optional for soft delete
  async softDelete(id) {
    // Soft delete (e.g., set deleted_at timestamp)
  }
}
```

---

## 5. Complete Example

Here's a full example combining all patterns:

```javascript
const express = require('express')
const router = express.Router()
const { pagination, validate } = require('../lib/@system/Middleware')
const {
  handleList,
  handleGetById,
  handleCreate,
  handleUpdate,
  handleDelete,
  parseSearchQuery,
  buildWhereClause,
  buildOrderByClause,
  authenticate,
} = require('../lib/@system/Helpers')
const postsRepo = require('../repositories/posts')
const { createPostSchema, updatePostSchema } = require('../validation/posts')

// LIST with search, filters, sorting, pagination
router.get('/api/posts', pagination(), async (req, res, next) => {
  try {
    const search = parseSearchQuery(req.query, {
      defaultFields: ['title', 'content'],
    })
    
    const filters = {
      status: req.query.status,
      author_id: req.query.author,
    }
    
    const { whereClause, params } = buildWhereClause({
      searchQuery: search.query,
      searchFields: search.fields,
      filters,
    })
    
    const orderBy = buildOrderByClause({
      sortBy: req.query.sort,
      sortOrder: req.query.order,
      allowedFields: ['title', 'created_at', 'views'],
      defaultSort: 'created_at',
    })
    
    await handleList({
      repo: postsRepo,
      req,
      res,
      next,
      filters: { whereClause, params, orderBy },
    })
  } catch (err) {
    next(err)
  }
})

// GET by ID
router.get('/api/posts/:id', (req, res, next) => {
  handleGetById({ repo: postsRepo, req, res, next })
})

// CREATE
router.post('/api/posts', authenticate, validate(createPostSchema), (req, res, next) => {
  handleCreate({
    repo: postsRepo,
    req,
    res,
    next,
    transformData: async (body, req) => ({
      ...body,
      author_id: req.user.id,
      created_at: new Date(),
    }),
  })
})

// UPDATE
router.patch('/api/posts/:id', authenticate, validate(updatePostSchema), (req, res, next) => {
  handleUpdate({
    repo: postsRepo,
    req,
    res,
    next,
    transformData: async (body, req, existing) => {
      if (existing.author_id !== req.user.id) {
        throw new Error('Unauthorized')
      }
      return {
        ...existing,
        ...body,
        updated_at: new Date(),
      }
    },
  })
})

// DELETE
router.delete('/api/posts/:id', authenticate, (req, res, next) => {
  handleDelete({
    repo: postsRepo,
    req,
    res,
    next,
    hardDelete: false,  // Soft delete
  })
})

module.exports = router
```

---

## 6. Best Practices

### ✅ Do

- Use `pagination()` middleware on list endpoints
- Whitelist sortable fields with `allowedFields`
- Use `transformData` for adding computed fields (e.g., `author_id` from auth)
- Implement soft delete when appropriate
- Use custom `dataKey` for semantic clarity (`posts` not `data`)

### ❌ Don't

- Don't skip sanitization on search queries (use `sanitizeSearchQuery`)
- Don't allow unlimited page sizes without `allowAll: true`
- Don't expose database errors - catch and return user-friendly messages
- Don't mix SQL directly in routes - keep it in repositories

---

## 7. Testing

```javascript
describe('GET /api/posts', () => {
  it('should paginate results', async () => {
    const res = await request(app)
      .get('/api/posts?limit=10&page=2')
      .expect(200)
    
    expect(res.body).toHaveProperty('data')
    expect(res.body).toHaveProperty('total')
    expect(res.body.page).toBe(2)
    expect(res.body.limit).toBe(10)
  })
  
  it('should search posts', async () => {
    const res = await request(app)
      .get('/api/posts?q=javascript&fields=title')
      .expect(200)
    
    expect(res.body.data.length).toBeGreaterThan(0)
  })
})
```

---

## 8. Troubleshooting

**Pagination not working?**
- Make sure you use `pagination()` middleware before the handler
- Check that `req.pagination` is passed to `formatPaginatedResponse`

**Search returning no results?**
- Verify field names match your database columns
- Check that search query isn't empty with `search.isEmpty`
- Try `caseSensitive: false` (default) for better matching

**CRUD handlers failing?**
- Ensure your repository implements the required methods
- Check that validation schemas match the expected input
- Use `transformData` to map request data to database fields

---

## Summary

This template provides production-ready patterns for:

- **Pagination**: Parse limit/offset/page, format responses
- **Search**: Build SQL conditions, parse queries, sort results
- **CRUD**: Reduce boilerplate with reusable handlers

Use individual helpers for flexibility, or `createCrudRouter` for rapid scaffolding.
