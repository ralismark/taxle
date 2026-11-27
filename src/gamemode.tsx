import * as INat from './api'
import AsyncSelect from 'react-select/async'
import { TaxonLabel } from './TaxonLabel'
import { createContext } from 'react'

export type Gamemode = {
  place: INat.Place | null,
  rootTaxon: INat.Taxon,
}

export const DEFAULT_GAMEMODE: Gamemode = {
  place: null,
  rootTaxon: INat.TAXON_LIFE,
}

export const GamemodeContext = createContext(DEFAULT_GAMEMODE)

export async function gamemodeFromQueryParams(): Promise<Gamemode> {
  const gm: Gamemode = {...DEFAULT_GAMEMODE}
  const pageSearchParams = new URLSearchParams(location.search)

  const asNat = (v: string | null): number | null => {
    if (v === null) return null
    const n = Number(v)
    if (!isFinite(n) || n <= 0) return null
    return n
  }

  const place = asNat(pageSearchParams.get("place"))
  if (place) gm.place = await INat.places_details.fetch(place)

  const rootTaxon = asNat(pageSearchParams.get("taxon"))
  if (rootTaxon) gm.rootTaxon = await INat.taxa_details.fetch(rootTaxon)

  return gm
}

export function gamemodeToQueryParams(gm: Gamemode): URLSearchParams {
  const params = new URLSearchParams()
  if (gm.place) {
    params.set("place", gm.place.id.toString())
  }
  if (gm.rootTaxon.id !== INat.TAXON_LIFE.id) {
    params.set("taxon", gm.rootTaxon.id.toString())
  }

  return params
}

// ----------------------------------------------------------------------------

export function GamemodeSelector(props: {
  gamemode: Gamemode,
  setGamemode: (gm: Gamemode) => void,
}) {
  const selectTheme = (theme: any) => ({
    ...theme,
    colors: {
      ...theme.colors,
      primary25: "var(--button-tint)", // menu hovered
      primary: "var(--primary)", // menu selected

      neutral0: "var(--box-tint)", // background
      neutral20: "var(--stroke)",
      neutral80: "var(--body-fg)", // normal text
    }
  })

  return <>
    <label>
      In area...

      <AsyncSelect
        value={props.gamemode.place}
        onChange={p => props.setGamemode({...props.gamemode, place: p})}

        isClearable={true}
        placeholder="Anywhere"
        noOptionsMessage={q => q ? "Type to search" : "No options"}

        cacheOptions
        loadOptions={async (q: string): Promise<INat.Place[]> => {
          return await INat.places_search.fetch({ q })
        }}

        getOptionValue={p => p.id.toString()}
        formatOptionLabel={p => p.display_name}

        theme={selectTheme}
      />
    </label>

    <label>
      Under taxon...

      <AsyncSelect
        value={props.gamemode.rootTaxon}
        onChange={o => props.setGamemode({...props.gamemode, rootTaxon: o ?? INat.TAXON_LIFE})}

        isClearable={true}
        defaultValue={INat.TAXON_LIFE}

        cacheOptions
        defaultOptions
        loadOptions={async (q: string): Promise<INat.Taxon[]> => {
          if (!q) return [INat.TAXON_LIFE, ...await INat.taxa_iconic.fetch({})]
          return await INat.taxa_autocomplete.fetch({ q, })
        }}

        getOptionValue={taxon => taxon.id.toString()}
        formatOptionLabel={taxon => <TaxonLabel taxon={taxon} />}

        theme={selectTheme}
      />
      </label>
  </>
}

// ----------------------------------------------------------------------------

export async function getObservation(gm: Gamemode): Promise<INat.Observation> {
  const q: INat.ObservationSearchParams = {
    quality_grade: ["research"],
    place_id: gm.place ? [gm.place.id] : undefined,
    taxon_id: [gm.rootTaxon.id],
    order_by: "random",
    photos: true,
  }

  const preSearch = await INat.observation_search.fetch({...q, per_page: 0})
  const search = await INat.observation_search.fetch({
    ...q,
    per_page: 1,
    page: Math.floor(Math.random() * Math.min(10_000, preSearch?._total_results ?? 1)),
  })

  return search && search[0]
}
