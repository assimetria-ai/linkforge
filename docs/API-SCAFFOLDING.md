# API Scaffolding Guide

Complete reference for building APIs with built-in helpers, middleware, and patterns.

## Table of Contents

1. [Quick Start](#quick-start)
2. [CRUD Helpers](#crud-helpers)
3. [Pagination](#pagination)
4. [Search & Filtering](#search--filtering)
5. [Sorting](#sorting)
6. [Repository Pattern](#repository-pattern)
7. [Response Helpers](#response-helpers)
8. [Query Builder](#query-builder)
9. [Best Practices](#best-practices)

---

## Quick Start

### Option 1: Auto-Generated CRUD Router (Zero Boilerplate)

```javascript
const { createCrudRouter } = require('../lib/@system/Helpers')
const ProductRepo = require('../db/repos/@custom/ProductRepo')
const { authenticate } = require('../lib/@system/Helpers/auth')
const { CreateProductSchema, UpdateProductSchema } = require('./schemas')

module.exports = createCrudRouter({
  repo: ProductRepo,
  
  validation: {
    create: { body: CreateProductSchema },
    update: { body: UpdateProductSchema },
  },
  
  middleware: {
    create: [authenticate],
    update: [authenticate],
    delete: [authenticate],
  },
  
  config: {
    basePath: '/api/products',
    dataKey: 'product',
    messages: {
      notFound: 'Product not found',
      deleted: 'Product deleted successfully',
    },
  },
})
```

### Option 2: Manual CRUD with Helpers (Recommended for Custom Logic)

```javascript
const {
  handleList,
  handleGetById,
  handleCreate,
  handleUpdate,
  handleDelete,
  pagination,
  asyncHandler,
  validateIdParam,
} = require('../lib/@system/Helpers')

const ProductRepo = require('../db/repos/@custom/ProductRepo')

// LIST
router.get(
  '/api/products',
  pagination({ defaultLimit: 20, maxLimit: 100 }),
  asyncHandler((req, res, next) => {
    handleList({
      repo: ProductRepo,
      req,
      res,
      next,
      dataKey: 'products',
    })
  })
)

// GET BY ID
router.get(
  '/api/products/:id',
  validateIdParam('integer'),
  asyncHandler((req, res, next) => {
    handleGetById({
      repo: ProductRepo,
      req,
      res,
      next,
      dataKey: 'product',
    })
  })
)
```

---

## CRUD Helpers

### handleList

List resources with automatic pagination, search, and filtering.

```javascript
await handleList({
  repo: ProductRepo,
  req,
  res,
  next,
  
  // Optional: custom filters
  filters: {
    whereClause: 'category = $1 AND status = $2',
    params: ['electronics', 'active'],
    orderBy: 'created_at DESC',
  },
  
  // Optional: default filters
  defaults: {
    is_deleted: false,
  },
  
  // Optional: custom response key
  dataKey: 'products',
})
```

**Response:**
```json
{
  "data": [...],
  "total": 150,
  "limit": 20,
  "offset": 0,
  "page": 1,
  "total_pages": 8,
  "has_more": true
}
```

### handleGetById

Get a single resource by ID.

```javascript
await handleGetById({
  repo: ProductRepo,
  req,
  res,
  next,
  idParam: 'id',           // default: 'id'
  dataKey: 'product',       // default: 'data'
  notFoundMessage: 'Product not found',
})
```

### handleCreate

Create a new resource.

```javascript
await handleCreate({
  repo: ProductRepo,
  req,
  res,
  next,
  
  // Optional: transform data before creating
  transformData: async (body, req) => {
    return {
      ...body,
      user_id: req.user.id,
      created_at: new Date().toISOString(),
    }
  },
  
  dataKey: 'product',
  statusCode: 201,
})
```

### handleUpdate

Update an existing resource.

```javascript
await handleUpdate({
  repo: ProductRepo,
  req,
  res,
  next,
  
  // Optional: transform data before updating
  transformData: async (body, req, existing) => {
    // Access existing resource for validation
    if (req.user.id !== existing.user_id) {
      throw new Error('Not authorized')
    }
    
    return {
      ...body,
      updated_at: new Date().toISOString(),
    }
  },
  
  dataKey: 'product',
  notFoundMessage: 'Product not found',
})
```

### handleDelete

Delete a resource.

```javascript
await handleDelete({
  repo: ProductRepo,
  req,
  res,
  next,
  hardDelete: false,  // Use soft delete (requires repo.softDelete method)
  notFoundMessage: 'Product not found',
  successMessage: 'Product deleted successfully',
})
```

---

## Pagination

Automatic pagination middleware parses `limit`, `offset`, and `page` query parameters.

### Usage

```javascript
const { pagination } = require('../lib/@system/Helpers')

router.get(
  '/api/products',
  pagination({ 
    defaultLimit: 20,   // default page size
    maxLimit: 100,      // maximum allowed page size
    allowAll: false,    // allow limit=-1 for all results
  }),
  async (req, res) => {
    console.log(req.pagination)
    // { limit: 20, offset: 0, page: 1 }
  }
)
```

### Query Examples

```
GET /api/products?limit=10&offset=20
GET /api/products?page=3&limit=25
GET /api/products?limit=-1  (if allowAll: true)
```

### Format Response

```javascript
const { formatPaginatedResponse } = require('../lib/@system/Helpers')

const data = await repo.findAll({ limit: 20, offset: 0 })
const total = await repo.count()

const response = formatPaginatedResponse(data, total, req.pagination)
// {
//   data: [...],
//   total: 150,
//   limit: 20,
//   offset: 0,
//   page: 1,
//   total_pages: 8,
//   has_more: true
// }
```

---

## Search & Filtering

### Basic Filtering

```javascript
const { filtering } = require('../lib/@system/Helpers')

router.get(
  '/api/products',
  filtering({
    allowedFields: ['category', 'status', 'is_active'],
    numberFields: ['price', 'stock'],
    booleanFields: ['is_active', 'is_featured'],
    arrayFields: ['tags'],
  }),
  async (req, res) => {
    console.log(req.filters)
    // { category: 'electronics', is_active: true, tags: ['new', 'sale'] }
  }
)
```

### Advanced Filtering with Operators

```javascript
const { advancedFiltering } = require('../lib/@system/Helpers')

router.get(
  '/api/products',
  advancedFiltering({
    allowedFields: ['price', 'name', 'status'],
    fieldTypes: {
      price: 'number',
      name: 'string',
    },
  }),
  async (req, res) => {
    console.log(req.filters)
    // {
    //   filters: [...],
    //   params: [...],
    //   whereClause: 'price >= $1 AND price <= $2 AND name ILIKE $3'
    // }
  }
)
```

**Query Examples:**
```
GET /api/products?price[gte]=100&price[lte]=500
GET /api/products?name[like]=laptop
GET /api/products?status[in]=active,pending
GET /api/products?created_at[gt]=2024-01-01
```

**Supported Operators:**
- `eq` - equals
- `ne` - not equals
- `gt` - greater than
- `gte` - greater than or equal
- `lt` - less than
- `lte` - less than or equal
- `in` - in array
- `nin` - not in array
- `like` - SQL LIKE (case-sensitive)
- `ilike` - SQL ILIKE (case-insensitive)

### Search

```javascript
const { parseSearchQuery, buildWhereClause } = require('../lib/@system/Helpers')

const search = parseSearchQuery(req.query, {
  defaultFields: ['name', 'description'],
})
// { query: 'laptop', fields: ['name', 'description'], isEmpty: false }

const { whereClause, params } = buildWhereClause({
  searchQuery: search.query,
  searchFields: search.fields,
  filters: { category: 'electronics' },
})
// whereClause: 'WHERE (LOWER(name) ILIKE $1 OR LOWER(description) ILIKE $2) AND category = $3'
// params: ['%laptop%', '%laptop%', 'electronics']
```

### All-in-One Query Parser

```javascript
const { parseQueryParams } = require('../lib/@system/Helpers')

const queryConfig = parseQueryParams(req, {
  searchFields: ['name', 'description'],
  sortableFields: ['name', 'price', 'created_at'],
  filterFields: ['category', 'status'],
  booleanFields: ['is_active'],
  arrayFields: ['tags'],
})
// Returns: { search, filters, whereClause, params, orderBy, pagination }
```

---

## Sorting

### Basic Sorting

```javascript
const { sorting } = require('../lib/@system/Helpers')

router.get(
  '/api/products',
  sorting({
    allowedFields: ['name', 'price', 'created_at'],
    defaultField: 'created_at',
    defaultOrder: 'desc',
  }),
  async (req, res) => {
    console.log(req.sorting)
    // { field: 'price', order: 'asc', clause: 'price ASC' }
  }
)
```

**Query Examples:**
```
GET /api/products?sort=price&order=asc
GET /api/products?sort=name&order=desc
```

### Multi-Field Sorting

```javascript
const { multiSort } = require('../lib/@system/Helpers')

router.get(
  '/api/products',
  multiSort({
    allowedFields: ['category', 'price', 'name'],
    defaultSort: 'created_at:desc',
    maxSorts: 3,
  }),
  async (req, res) => {
    console.log(req.sorting)
    // {
    //   fields: [
    //     { field: 'category', order: 'asc' },
    //     { field: 'price', order: 'desc' }
    //   ],
    //   clause: 'category ASC, price DESC'
    // }
  }
)
```

**Query Examples:**
```
GET /api/products?sort=category:asc,price:desc
GET /api/products?sort=name:asc,created_at:desc
```

---

## Repository Pattern

### Using BaseRepository

```javascript
const { BaseRepository } = require('../lib/@system/Helpers')
const db = require('../PostgreSQL')

class ProductRepository extends BaseRepository {
  constructor() {
    super(db, 'products', {
      idColumn: 'id',
      columns: ['*'],  // or specify specific columns
    })
  }
  
  // Standard methods inherited from BaseRepository:
  // - findAll(params)
  // - count(params)
  // - findById(id)
  // - findOne(criteria)
  // - findBy(criteria, options)
  // - create(data)
  // - createMany(rows)
  // - update(id, data)
  // - delete(id)
  // - softDelete(id)
  // - bulkDelete(ids)
  // - exists(id)
  // - existsBy(criteria)
  
  // Add custom methods:
  async findByCategory(category, options = {}) {
    return this.findBy({ category }, options)
  }
  
  async getActiveProducts() {
    return this.findBy({ status: 'active', is_deleted: false }, {
      orderBy: 'created_at DESC',
    })
  }
  
  async getStats(userId) {
    const sql = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'draft') as draft
      FROM ${this.table}
      WHERE user_id = $1
    `
    const result = await this.query(sql, [userId])
    return result.rows[0]
  }
  
  // Use transactions:
  async createWithTags(productData, tags) {
    return this.transaction(async () => {
      const product = await this.create(productData)
      
      for (const tag of tags) {
        await this.query(
          'INSERT INTO product_tags (product_id, tag) VALUES ($1, $2)',
          [product.id, tag]
        )
      }
      
      return product
    })
  }
}

module.exports = new ProductRepository()
```

### Repository Methods

```javascript
// Find operations
const products = await ProductRepo.findAll({
  whereClause: 'category = $1',
  params: ['electronics'],
  orderBy: 'created_at DESC',
  limit: 20,
  offset: 0,
})

const product = await ProductRepo.findById(123)
const product = await ProductRepo.findOne({ sku: 'ABC123' })
const products = await ProductRepo.findBy({ category: 'electronics' })

// Create operations
const newProduct = await ProductRepo.create({
  name: 'Laptop',
  price: 999.99,
  category: 'electronics',
})

const bulkProducts = await ProductRepo.createMany([
  { name: 'Product 1', price: 10 },
  { name: 'Product 2', price: 20 },
])

// Update operations
const updated = await ProductRepo.update(123, {
  price: 899.99,
  updated_at: new Date().toISOString(),
})

// Delete operations
await ProductRepo.delete(123)  // Hard delete
await ProductRepo.softDelete(123)  // Sets deleted_at
await ProductRepo.bulkDelete([1, 2, 3])

// Existence checks
const exists = await ProductRepo.exists(123)
const exists = await ProductRepo.existsBy({ sku: 'ABC123' })
```

---

## Response Helpers

Standardized response formatters.

```javascript
const {
  success,
  created,
  noContent,
  error,
  notFound,
  unauthorized,
  forbidden,
  validationError,
  conflict,
  tooManyRequests,
  serverError,
} = require('../lib/@system/Helpers')

// Success responses
return success(res, product, 'Product retrieved')
return created(res, product, 'Product created')
return noContent(res)

// Error responses
return error(res, 'Invalid input', 400)
return notFound(res, 'Product not found')
return unauthorized(res)
return forbidden(res, 'Access denied')
return validationError(res, { name: 'Required' })
return conflict(res, 'Product already exists')
return tooManyRequests(res, 'Rate limit exceeded', 60)
return serverError(res)
```

**Alternative: Object Helpers**

```javascript
const { successResponse, errorResponse } = require('../lib/@system/Helpers')

// Build response objects
const response = successResponse(product, {
  message: 'Product created',
})
// { success: true, message: '...', data: {...} }

const response = errorResponse('Not found', {
  code: 'PRODUCT_NOT_FOUND',
  details: { id: 123 },
})
// { success: false, message: '...', code: '...', details: {...} }
```

---

## Query Builder

Low-level SQL builder for complex queries.

```javascript
const {
  buildInsert,
  buildUpdate,
  buildDelete,
  buildSelect,
  buildCount,
  buildBulkInsert,
  buildUpsert,
} = require('../lib/@system/Helpers')

// INSERT
const { sql, params } = buildInsert('products', {
  name: 'Laptop',
  price: 999.99,
}, { returning: true })
// INSERT INTO products (name, price) VALUES ($1, $2) RETURNING *
// params: ['Laptop', 999.99]

// UPDATE
const { sql, params } = buildUpdate('products', {
  price: 899.99,
}, 123, { returning: true })
// UPDATE products SET price = $1 WHERE id = $2 RETURNING *
// params: [899.99, 123]

// SELECT
const { sql, params } = buildSelect('products', {
  whereClause: 'category = $1 AND price < $2',
  whereParams: ['electronics', 1000],
  orderBy: 'price ASC',
  limit: 20,
  offset: 0,
})
// SELECT * FROM products WHERE category = $1 AND price < $2 ORDER BY price ASC LIMIT $3 OFFSET $4

// COUNT
const { sql, params } = buildCount('products', {
  whereClause: 'category = $1',
  whereParams: ['electronics'],
})
// SELECT COUNT(*) as count FROM products WHERE category = $1

// BULK INSERT
const { sql, params } = buildBulkInsert('products', [
  { name: 'Product 1', price: 10 },
  { name: 'Product 2', price: 20 },
])
// INSERT INTO products (name, price) VALUES ($1, $2), ($3, $4) RETURNING *

// UPSERT
const { sql, params } = buildUpsert('products', 
  { sku: 'ABC123', name: 'Laptop', price: 999 },
  'sku',
  { name: 'Laptop', price: 999 }
)
// INSERT INTO products (sku, name, price) VALUES ($1, $2, $3)
// ON CONFLICT (sku) DO UPDATE SET name = $4, price = $5 RETURNING *
```

---

## Best Practices

### 1. Use Repositories for Data Access

```javascript
// ✅ Good
const products = await ProductRepo.findAll({ ... })

// ❌ Bad - direct DB queries in routes
const products = await db.query('SELECT * FROM products')
```

### 2. Validate Input with Schemas

```javascript
const { z } = require('zod')

const CreateProductSchema = z.object({
  name: z.string().min(1).max(200),
  price: z.number().positive(),
  category: z.enum(['electronics', 'books', 'clothing']),
})

router.post(
  '/api/products',
  validate({ body: CreateProductSchema }),
  ...
)
```

### 3. Use Transform Functions for Business Logic

```javascript
await handleCreate({
  repo: ProductRepo,
  req, res, next,
  
  transformData: async (body, req) => {
    // Add computed fields
    const slug = generateSlug(body.name)
    
    // Add context
    const user_id = req.user.id
    
    // Whitelist fields
    const allowed = extractAllowedFields(body, [
      'name', 'price', 'category'
    ])
    
    return { ...allowed, slug, user_id }
  },
})
```

### 4. Handle Errors Properly

```javascript
const { asyncHandler } = require('../lib/@system/Helpers')

router.get('/api/products/:id', asyncHandler(async (req, res, next) => {
  // Errors automatically caught and passed to error handler
  const product = await ProductRepo.findById(req.params.id)
  
  if (!product) {
    return notFound(res, 'Product not found')
  }
  
  return success(res, product)
}))
```

### 5. Combine Helpers for Complex Queries

```javascript
const { parseQueryParams, buildWhereClause, buildOrderByClause } = require('../lib/@system/Helpers')

const queryConfig = parseQueryParams(req, {
  searchFields: ['name', 'description'],
  sortableFields: ['name', 'price', 'created_at'],
  filterFields: ['category', 'status'],
  booleanFields: ['is_active'],
})

const products = await ProductRepo.findAll({
  whereClause: queryConfig.whereClause,
  params: queryConfig.params,
  orderBy: queryConfig.orderBy,
  limit: req.pagination.limit,
  offset: req.pagination.offset,
})
```

---

## Complete Example

```javascript
const express = require('express')
const router = express.Router()
const {
  handleList,
  handleGetById,
  handleCreate,
  handleUpdate,
  handleDelete,
  pagination,
  validate,
  asyncHandler,
  validateIdParam,
  authenticate,
  requireAdmin,
} = require('../lib/@system/Helpers')

const ProductRepo = require('../db/repos/@custom/ProductRepo')
const { CreateProductSchema, UpdateProductSchema } = require('./schemas')

// LIST with search, filters, pagination, sorting
router.get(
  '/api/products',
  pagination({ defaultLimit: 20, maxLimit: 100 }),
  asyncHandler((req, res, next) => {
    const queryConfig = parseQueryParams(req, {
      searchFields: ['name', 'description'],
      sortableFields: ['name', 'price', 'created_at'],
      filterFields: ['category', 'status'],
      booleanFields: ['is_active'],
    })
    
    handleList({
      repo: ProductRepo,
      req, res, next,
      filters: queryConfig,
      dataKey: 'products',
    })
  })
)

// GET BY ID
router.get(
  '/api/products/:id',
  validateIdParam('integer'),
  asyncHandler((req, res, next) => {
    handleGetById({
      repo: ProductRepo,
      req, res, next,
      dataKey: 'product',
    })
  })
)

// CREATE
router.post(
  '/api/products',
  authenticate,
  validate({ body: CreateProductSchema }),
  asyncHandler((req, res, next) => {
    handleCreate({
      repo: ProductRepo,
      req, res, next,
      transformData: async (body, req) => ({
        ...body,
        user_id: req.user.id,
        created_at: new Date().toISOString(),
      }),
      dataKey: 'product',
    })
  })
)

// UPDATE
router.patch(
  '/api/products/:id',
  authenticate,
  validateIdParam('integer'),
  validate({ body: UpdateProductSchema }),
  asyncHandler((req, res, next) => {
    handleUpdate({
      repo: ProductRepo,
      req, res, next,
      transformData: async (body, req, existing) => {
        if (req.user.id !== existing.user_id && !req.user.is_admin) {
          throw new Error('Not authorized')
        }
        return {
          ...body,
          updated_at: new Date().toISOString(),
        }
      },
      dataKey: 'product',
    })
  })
)

// DELETE
router.delete(
  '/api/products/:id',
  authenticate,
  requireAdmin,
  validateIdParam('integer'),
  asyncHandler((req, res, next) => {
    handleDelete({
      repo: ProductRepo,
      req, res, next,
      hardDelete: false,
      successMessage: 'Product deleted',
    })
  })
)

module.exports = router
```

---

## Summary

This API scaffolding provides:

✅ **CRUD Helpers** - Reduce boilerplate with `handleList`, `handleGetById`, `handleCreate`, `handleUpdate`, `handleDelete`  
✅ **Pagination** - Automatic parsing of `limit`, `offset`, `page` query params  
✅ **Search** - Full-text search with `LIKE`/`ILIKE` across multiple fields  
✅ **Filtering** - Simple and advanced filtering with operators (`gt`, `lt`, `in`, `like`, etc.)  
✅ **Sorting** - Single and multi-field sorting  
✅ **Repository Pattern** - BaseRepository class with common operations  
✅ **Response Helpers** - Standardized success/error responses  
✅ **Query Builder** - Type-safe SQL query building  

**Next Steps:**
1. Copy `/api/@custom/TEMPLATE.js` for new endpoints
2. Extend `BaseRepository` for custom repositories
3. Use validation schemas with Zod
4. Combine helpers for complex APIs

For more examples, see:
- `/api/@custom/TEMPLATE.js`
- `/lib/@system/Helpers/examples.js`
- `/lib/@system/Helpers/README.md`
