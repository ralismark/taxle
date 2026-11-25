import { DependencyList, useEffect, useState } from "react"

export const API_BASE = "https://api.inaturalist.org/v2"

// Taxon for the life state-of-matter
//
// Note that it will not appear in taxon ancestries
export const TAXON_ID_LIFE = 48460

type ApiResult<T> = {
  total_results: number,
  page: number,
  per_page: number,
  results: T,
}

type ApiError = {
  status: string,
  errors: {
    errorCode: string,
    message: string,
  }[]
}

export class Api<Args, Out> {
  constructor(
    readonly createUrl: (args: Args) => string,
    readonly mapper: (results: ApiResult<any>) => Out = x => x.results,
  ) {}

  use(args: Args, deps: DependencyList): Out | undefined {
    const [value, setValue] = useState<{v?: Out, e?: Error}>({v: undefined})

    useEffect(() =>  {
      const aborter = new AbortController()
      fetch(API_BASE + this.createUrl(args), {
        signal: aborter.signal,
      })
        .then(r => r.json())
        .then((r: ApiResult<any> | ApiError) => {
          if ("status" in r) {
            throw Error(r.errors[0].message)
          } else {
            const v = this.mapper(r)
            setValue({v})
          }
        })
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
    Object.entries(args)
      .map(([k, v]) => {
        if (v instanceof Array) {
          return [k, v.join(",")]
        } else {
          return [k, String(v)]
        }
      })
  )
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

export const observation_details = new Api<string, Observation>(
  uuid => `/observations/${uuid}?fields=all`,
  r => r.results[0],
)

export const taxa_details = new Api<number, TaxonDetails>(
  id => `/taxa/${id}?fields=all`,
  r => r.results[0],
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

export const observation_search = new Api<{
  q?: string,
  identified?: boolean,
  quality_grade?: ("casual" | "needs_id" | "research")[],
  obscuration?: ("obscured" | "private" | "none")[],
  place_id?: number[],
  taxon_id?: number[],
  order?: "desc" | "asc",
  order_by?: "created_at" | "geo_score" | "id" | "observed_on" | "random" | "species_guess" | "updated_at" | "votes",

  page?: number,
  per_page?: number,
}, Observation[] & {_total_results: number}>(
  args => `/observations?` + urlParams({
    ...args,
    fields: "all",
  }),
  r => {
    r.results._total_results = r.total_results
    return r.results
  },
)
