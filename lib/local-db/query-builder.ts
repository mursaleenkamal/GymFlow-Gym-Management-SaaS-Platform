import { store } from './store'


export interface QueryResult<T = any> {
  data: T | null
  error: any | null
  count?: number | null
  status?: number
  statusText?: string
}

export class LocalQueryBuilder<T = any> implements PromiseLike<QueryResult<T>> {
  private tableName: string
  private filters: Array<(row: any) => boolean> = []
  private _order: { column: string; ascending: boolean } | null = null
  private _limit: number | null = null
  private _range: { from: number; to: number } | null = null
  private _mode: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select'
  private _payload: any = null
  private _single = false
  private _maybeSingle = false
  private _selectColumns: string = '*'
  private _countOption?: 'exact' | 'planned' | 'estimated'
  private _headOnly = false
  private _onConflict?: string

  constructor(tableName: string) {
    this.tableName = tableName
  }

  select(columns = '*', options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) {
    if (this._mode !== 'insert' && this._mode !== 'update' && this._mode !== 'upsert') {
      this._mode = 'select'
    }
    this._selectColumns = columns
    if (options?.count) this._countOption = options.count
    if (options?.head) this._headOnly = options.head
    return this
  }

  insert(values: any | any[]) {
    this._mode = 'insert'
    this._payload = values
    return this
  }

  update(values: Record<string, any>) {
    this._mode = 'update'
    this._payload = values
    return this
  }

  upsert(values: any | any[], options?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this._mode = 'upsert'
    this._payload = values
    if (options?.onConflict) this._onConflict = options.onConflict
    return this
  }

  delete() {
    this._mode = 'delete'
    return this
  }

  eq(column: string, value: any) {
    this.filters.push((row) => row[column] === value)
    return this
  }

  neq(column: string, value: any) {
    this.filters.push((row) => row[column] !== value)
    return this
  }

  gt(column: string, value: any) {
    this.filters.push((row) => row[column] > value)
    return this
  }

  gte(column: string, value: any) {
    this.filters.push((row) => row[column] >= value)
    return this
  }

  lt(column: string, value: any) {
    this.filters.push((row) => row[column] < value)
    return this
  }

  lte(column: string, value: any) {
    this.filters.push((row) => row[column] <= value)
    return this
  }

  like(column: string, pattern: string) {
    const regex = new RegExp('^' + pattern.replace(/%/g, '.*').replace(/_/g, '.') + '$')
    this.filters.push((row) => regex.test(String(row[column] ?? '')))
    return this
  }

  ilike(column: string, pattern: string) {
    const regex = new RegExp('^' + pattern.replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i')
    this.filters.push((row) => regex.test(String(row[column] ?? '')))
    return this
  }

  is(column: string, value: any) {
    this.filters.push((row) => (value === null ? row[column] === null || row[column] === undefined : row[column] === value))
    return this
  }

  in(column: string, values: any[]) {
    this.filters.push((row) => values.includes(row[column]))
    return this
  }

  contains(column: string, value: any) {
    this.filters.push((row) => {
      const field = row[column]
      if (Array.isArray(field)) {
        if (Array.isArray(value)) return value.every((v) => field.includes(v))
        return field.includes(value)
      }
      if (typeof field === 'string') {
        return field.includes(String(value))
      }
      return false
    })
    return this
  }

  not(column: string, operator: string, value: any) {
    if (operator === 'is' && value === null) {
      this.filters.push((row) => row[column] !== null && row[column] !== undefined)
    } else if (operator === 'eq') {
      this.filters.push((row) => row[column] !== value)
    } else if (operator === 'in' && Array.isArray(value)) {
      this.filters.push((row) => !value.includes(row[column]))
    } else {
      this.filters.push((row) => row[column] !== value)
    }
    return this
  }

  or(filtersString: string) {
    // Basic PostgREST OR parser: "col1.eq.val1,col2.eq.val2"
    const parts = filtersString.split(',')
    const parsedMatchers = parts.map((part) => {
      const match = part.match(/^([^.]+)\.([^.]+)\.(.*)$/)
      if (!match) return () => false
      const [, col, op, rawVal] = match
      const val = rawVal === 'null' ? null : rawVal === 'true' ? true : rawVal === 'false' ? false : rawVal
      return (r: any) => {
        if (op === 'eq') return String(r[col]) === String(val)
        if (op === 'ilike') return new RegExp(String(val ?? '').replace(/%/g, '.*'), 'i').test(String(r[col] ?? ''))
        return false

      }
    })

    this.filters.push((row) => parsedMatchers.some((matcher) => matcher(row)))
    return this
  }

  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) {
    this._order = { column, ascending: options?.ascending !== false }
    return this
  }

  limit(count: number) {
    this._limit = count
    return this
  }

  range(from: number, to: number) {
    this._range = { from, to }
    return this
  }

  single() {
    this._single = true
    return this
  }

  maybeSingle() {
    this._maybeSingle = true
    return this
  }

  private execute(): QueryResult<T> {
    const table = store.getTable(this.tableName)

    switch (this._mode) {
      case 'insert': {
        const rowsToInsert = Array.isArray(this._payload) ? this._payload : [this._payload]
        const insertedRows: any[] = []

        // Enforce unique member_number per gym
        if (this.tableName === 'members') {
          for (const raw of rowsToInsert) {
            if (raw.member_number !== undefined && raw.member_number !== null) {
              const exists = table.some(
                (r) => r.gym_id === raw.gym_id && r.member_number === raw.member_number
              )
              if (exists) {
                return { data: null, error: { message: 'Duplicate key value violates unique constraint', code: '23505' } }
              }
            }
          }
        }

        for (const raw of rowsToInsert) {
          const row = { ...raw }
          if (!row.id) {
            row.id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `loc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
          }
          if (!row.created_at) {
            row.created_at = new Date().toISOString()
          }
          if (this.tableName === 'subscription_requests') {
            if (!row.status) row.status = 'pending'
            if (!row.submitted_at) row.submitted_at = row.created_at
          }
          table.push(row)
          insertedRows.push(row)
        }

        store.setTable(this.tableName, table)

        if (this._single || !Array.isArray(this._payload)) {
          return { data: insertedRows[0] as any, error: null }
        }
        return { data: insertedRows as any, error: null }
      }

      case 'update': {
        let updatedCount = 0
        const updatedRows: any[] = []
        for (let i = 0; i < table.length; i++) {
          if (this.filters.every((f) => f(table[i]))) {
            table[i] = { ...table[i], ...this._payload }
            updatedRows.push(table[i])
            updatedCount++
          }
        }
        store.setTable(this.tableName, table)

        if (this._single) {
          return { data: (updatedRows[0] ?? null) as any, error: null }
        }
        return { data: updatedRows as any, error: null, count: updatedCount }
      }

      case 'upsert': {
        const rowsToUpsert = Array.isArray(this._payload) ? this._payload : [this._payload]
        const conflictKey = this._onConflict || 'id'
        const resultRows: any[] = []

        for (const raw of rowsToUpsert) {
          const row = { ...raw }
          if (!row.id && conflictKey !== 'id') {
            row.id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `loc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
          }
          if (!row.created_at) {
            row.created_at = new Date().toISOString()
          }

          const existingIndex = table.findIndex((r) => r[conflictKey] === row[conflictKey])
          if (existingIndex >= 0) {
            table[existingIndex] = { ...table[existingIndex], ...row }
            resultRows.push(table[existingIndex])
          } else {
            table.push(row)
            resultRows.push(row)
          }
        }

        store.setTable(this.tableName, table)
        if (this._single || !Array.isArray(this._payload)) {
          return { data: resultRows[0] as any, error: null }
        }
        return { data: resultRows as any, error: null }
      }

      case 'delete': {
        const remaining = table.filter((row) => !this.filters.every((f) => f(row)))
        const deletedCount = table.length - remaining.length
        store.setTable(this.tableName, remaining)
        return { data: null, error: null, count: deletedCount }
      }

      case 'select':
      default: {
        let matching = table.filter((row) => this.filters.every((f) => f(row)))
        const totalMatching = matching.length

        if (this._order) {
          const { column, ascending } = this._order
          matching = matching.slice().sort((a, b) => {
            const valA = a[column]
            const valB = b[column]
            if (valA === valB) return 0
            if (valA === null || valA === undefined) return 1
            if (valB === null || valB === undefined) return -1
            if (valA < valB) return ascending ? -1 : 1
            return ascending ? 1 : -1
          })
        }

        if (this._range) {
          matching = matching.slice(this._range.from, this._range.to + 1)
        } else if (this._limit !== null) {
          matching = matching.slice(0, this._limit)
        }

        if (this._headOnly) {
          return { data: null, error: null, count: totalMatching }
        }

        matching = this.resolveRelations(matching)

        if (this._single) {
          if (matching.length === 0) {
            return { data: null, error: { message: 'Row not found', code: 'PGRST116' } }
          }
          return { data: matching[0] as any, error: null }
        }

        if (this._maybeSingle) {
          return { data: (matching[0] ?? null) as any, error: null }
        }

        return {
          data: matching as any,
          error: null,
          count: this._countOption ? totalMatching : undefined,
        }
      }
    }
  }

  private resolveRelations(rows: any[]): any[] {
    if (!this._selectColumns || this._selectColumns === '*' || !this._selectColumns.includes('(')) {
      return rows
    }

    const joinRegex = /(?:([a-zA-Z0-9_]+):)?([a-zA-Z0-9_]+)\s*\(([^)]*)\)/g
    const joins: Array<{ alias: string; targetTable: string; cols: string }> = []
    let match: RegExpExecArray | null
    while ((match = joinRegex.exec(this._selectColumns)) !== null) {
      joins.push({
        alias: match[1] || match[2],
        targetTable: match[2],
        cols: match[3].trim(),
      })
    }

    if (joins.length === 0) return rows

    const result = rows.map((r) => ({ ...r }))

    for (const join of joins) {
      const foreignTable = store.getTable(join.targetTable)
      const requestedCols = join.cols && join.cols !== '*' ? join.cols.split(',').map((c) => c.trim()) : null

      const pickCols = (obj: any) => {
        if (!obj) return null
        if (!requestedCols) return { ...obj }
        const picked: Record<string, any> = {}
        for (const col of requestedCols) {
          if (col in obj) picked[col] = obj[col]
        }
        return picked
      }

      for (const row of result) {
        // 1. Many-to-One: row has targetTable singular id (e.g. member_id for members, gym_id for gyms)
        const singularName = join.targetTable.endsWith('s') ? join.targetTable.slice(0, -1) : join.targetTable
        const fkName = `${singularName}_id`

        if (fkName in row) {
          const fkValue = row[fkName]
          const foreignRow = foreignTable.find((f: any) => f.id === fkValue)
          row[join.alias] = foreignRow ? pickCols(foreignRow) : null
          continue
        }

        // 2. One-to-Many: foreignTable rows have this.tableName singular id (e.g. member_id in memberships for members table)
        const mySingularName = this.tableName.endsWith('s') ? this.tableName.slice(0, -1) : this.tableName
        const myFkName = `${mySingularName}_id`
        const foreignRows = foreignTable.filter((f: any) => f[myFkName] === row.id)

        if (foreignRows.length > 0 || foreignTable.some((f: any) => myFkName in f)) {
          row[join.alias] = foreignRows.map((f: any) => pickCols(f))
        } else {
          // Fallback: match by id
          const foreignRow = foreignTable.find((f: any) => f.id === row.id)
          if (foreignRow) {
            row[join.alias] = pickCols(foreignRow)
          }
        }
      }
    }

    return result
  }

  async then<TResult1 = QueryResult<T>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    if (typeof window !== 'undefined') {
      await store.syncWithServer()
    }
    const result = this.execute()
    if (typeof window !== 'undefined' && this._mode !== 'select') {
      await store.pushToServer()
    }
    return Promise.resolve(result).then(onfulfilled, onrejected)
  }
}
