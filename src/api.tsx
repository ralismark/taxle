import { DependencyList, useEffect, useState } from "react"

export const API_BASE = "https://api.inaturalist.org/v2"

type ApiResult<T> = {
  total_results: number,
  page: number,
  per_page: number,
  results: T,
}

type ErrorResult = {
  status: string,
  errors: {
    errorCode: string,
    message: string,
  }[]
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly api: Api<any, any>,
    readonly args: any,
    readonly url: string,
  ) {
    super(message)
  }
}

export class Api<Args, Out> {
  constructor(
    readonly createUrl: (args: Args) => string,
    readonly mapper: (results: ApiResult<any>) => Out = x => x.results,
  ) {}

  async fetch(args: Args, opts: { signal?: AbortSignal } = {}): Promise<Out> {
    const url = API_BASE + this.createUrl(args)
    const r = await fetch(url, {
      signal: opts.signal,
    })
    const json: ApiResult<any> | ErrorResult = await r.json()
    if ("status" in json) {
      throw new ApiError(
        json.errors[0].message,
        this,
        args,
        url
      )
    } else {
      return this.mapper(json)
    }
  }

  use(args: Args, deps: DependencyList): Out | undefined {
    const [value, setValue] = useState<{v?: Out, e?: Error}>({v: undefined})

    useEffect(() =>  {
      const aborter = new AbortController()
      this.fetch(
        args,
        {
          signal: aborter.signal
        }
      )
        .then(v => setValue({v}))
        .catch(e => {
          if (e instanceof DOMException && e.name === "AbortError") return
          setValue({e})
        })

      return () => aborter.abort()
    }, deps)

    if (value.e) throw value.e
    return value.v
  }
}

function urlParams(args: { [k: string]: any }): URLSearchParams {
  return new URLSearchParams(
    Array.from(function*() {
      for (const [k, v] of Object.entries(args)) {
        if (v === undefined) {
          continue
        } if (v instanceof Array) {
          yield [k, v.join(",")]
        } else {
          yield [k, String(v)]
        }
      }
    }())
  )
}

function one<T>(arr: T[]): T | null {
  if (arr.length === 0) return null
  if (arr.length === 1) return arr[0]
  console.error("Too many elements", arr)
  throw RangeError("too many elements")
}

// ----------------------------------------------------------------------------

export type Photo = {
  id: number,
  attribution: string,
  hidden: boolean,
  original_dimensions: {
    height: number,
    width: number,
  },
  url: string,
}

export type Observation = {
  id: number,
  uuid: string,
  description: string | null,
  observed_on_string: string | null,
  observed_time_zone: string | null,
  place_guess: string | null,
  photos: Photo[] | null,

  taxon?: Taxon | null,
}

export type Taxon = {
  id: number,
  ancestor_ids: number[],

  name: string,
  preferred_common_name: string,
  rank: string,
  rank_level: number,
}

export type TaxonDetails = Taxon & {
  ancestors?: Taxon[],
  children?: Taxon[],
}

export const observations_details = new Api<string, Observation>(
  uuid => `/observations/${uuid}?fields=all`,
  r => one(r.results)!,
)

export const taxa_details = new Api<number, TaxonDetails>(
  id => `/taxa/${id}?fields=all`,
  r => one(r.results)!,
)

export const taxa_autocomplete = new Api<{
  q: string,
  is_active?: boolean,
  locale?: string,
  preferred_place_id?: number,
}, Taxon[] & {_total_results: number}>(
  args => `/taxa/autocomplete?` + urlParams({
    ...args,
    fields: "all",
  }),
  r => {
    r.results._total_results = r.total_results
    return r.results
  },
)

export const taxa_iconic = new Api<{}, Taxon[]>(
  () => `/taxa/iconic?fields=all`,
)

export type ObservationSearchParams = {
  q?: string,
  identified?: boolean,
  quality_grade?: ("casual" | "needs_id" | "research")[],
  obscuration?: ("obscured" | "private" | "none")[],
  place_id?: number[],
  taxon_id?: number[],
  order?: "desc" | "asc",
  order_by?: "created_at" | "geo_score" | "id" | "observed_on" | "random" | "species_guess" | "updated_at" | "votes",
  photos?: boolean,

  page?: number,
  per_page?: number,
}

export const observation_search = new Api<ObservationSearchParams, Observation[] & {_total_results: number}>(
  args => `/observations?` + urlParams({
    ...args,
    fields: "all",
  }),
  r => {
    r.results._total_results = r.total_results
    return r.results
  },
)

// Taxon for the life state-of-matter
//
// Note that it will not appear in taxon ancestries
export const TAXON_LIFE: Taxon = {
    id: 48460,
    ancestor_ids: [],
    name: "Life",
    preferred_common_name: "life",
    rank: "stateofmatter",
    rank_level: 100,
}

export type Place = {
  id: number,
  display_name: string,
  name: string,
}

export const places_search = new Api<{
  q: string,
  order_by?: "area",
  geo?: boolean,
}, Place[]>(
  args => `/places?` + urlParams({
    ...args,
    fields: "all",
  }),
)

export const places_details = new Api<number | string, Place>(
  id => `/places/${id}?fields=all`,
  r => one(r.results)!,
)
