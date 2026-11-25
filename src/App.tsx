import './App.css'
import { useState } from 'react';
import { ShowObservation } from './ShowObservation';
import * as INat from './api'

const pageSearchParams = new URLSearchParams(location.search)

// 18662 North Sydney, NS, AU
// 18683 Sydney - East, NS, AU
// 18685 Sydney - South, NS, AU
// 18684 Sydney - Inner, NS, AU
// 18686 Sydney - West, NS, AU
// 117995 NSW offshore Sydney south, AU
// 117996 NSW offshore Sydney north
// 195953 NSW offshore Sydney
// 142327 Greater Sydney Area, NSW AU
// 184726 Offshore Sydney
const BOUND_PLACE_ID = 142327

// 1 Animals
// 3 Birds
// 47126 Plants
// 47158 Insects
// 47170 Fungi Including Lichens
// 47119 Arachnids
// 40151 Mammals
// 26036 Reptiles
// 47115 Molluscs
// 20978 Amphibians
// 47178 Ray-finned Fishes
// 47686 protozoans
// 48222 kelp, diatoms, and allies
const BOUND_TAXON_ID = +(pageSearchParams.get("taxon") || INat.TAXON_ID_LIFE)

export function TaxonLabel(props: {
  taxon: INat.Taxon,
}) {
  return <span
    className={`TaxonLabel ${props.taxon.rank_level % 10 !== 0 ? "TaxonLabel--minor" : ""}`}
    data-rank={props.taxon.rank_level}
  >
    {props.taxon.preferred_common_name
      ? <>{props.taxon.preferred_common_name} <small>({props.taxon.rank}/{props.taxon.rank_level} {props.taxon.name})</small></>
      : <>{props.taxon.name} <small>({props.taxon.rank}/{props.taxon.rank_level})</small></>
    }
  </span>
}

export function SearchTaxa(props: {
  subtaxa: INat.Taxon[],
  setGuessTaxonId: (id: number) => void,
}) {
  const [input, setInput] = useState("")

  const autocomplete = INat.taxa_autocomplete.use({ q: input }, [input])
  const suggestions = input == "" ? props.subtaxa : (autocomplete ?? []).filter(t => {
    return BOUND_TAXON_ID == INat.TAXON_ID_LIFE || t.ancestor_ids.includes(BOUND_TAXON_ID)
  })

  return <>
    <input
      className="Taxle__input"
      value={input}
      onChange={e => setInput(e.target.value)}
      placeholder="What is this?"
    />

    <div className="Taxle__suggestions">
      {suggestions.map(taxon =>
        <div
          key={taxon.id}
          className="Taxon"
          role="button"
          onClick={() => {
            setInput("")
            props.setGuessTaxonId(taxon.id)
          }}
        >
          <TaxonLabel
            taxon={taxon}
          />
        </div>
      )}
    </div>
  </>
}

export function Taxle() {
  const [games, setGames] = useState(1)
  const [totalScore, setTotalScore] = useState(0)

  const preSearch = INat.observation_search.use({
    quality_grade: ["research"],
    place_id: [BOUND_PLACE_ID],
    taxon_id: [BOUND_TAXON_ID],
    order_by: "random",

    per_page: 0,
  }, [])
  const search = INat.observation_search.use({
    quality_grade: ["research"],
    place_id: [BOUND_PLACE_ID],
    taxon_id: [BOUND_TAXON_ID],
    order_by: "random",

    page: Math.floor(Math.random() * Math.min(10_000, preSearch?._total_results ?? 1)),
    per_page: 1,
  }, [games, preSearch])
  const obs = search && search[0]

  const [guessTaxonId, setGuessTaxonId] = useState(BOUND_TAXON_ID)
  const guessTaxon = INat.taxa_details.use(guessTaxonId, [guessTaxonId])
  const expectedTaxon = INat.taxa_details.use(obs?.taxon?.id ?? 1, [obs])
  const baseTaxon = INat.taxa_details.use(BOUND_TAXON_ID, [])

  const [submitted, setSubmitted] = useState(false)

  if (!obs || !guessTaxon || !expectedTaxon || !baseTaxon) return <main>loading...</main>

  console.log(
    "observation", obs,
    "taxonomy", expectedTaxon?.ancestors?.map(x => x.preferred_common_name ?? x.name)
  )

  const calcScore = () => {
    const guessHierarchy = [...(guessTaxon.ancestors ?? []), guessTaxon].filter(t => t.rank_level <= baseTaxon.rank_level)
    const expectedHierarchy = [...(expectedTaxon.ancestors ?? []), expectedTaxon].filter(t => t.rank_level <= baseTaxon.rank_level)

    let minRank = 100
    let mismatched = false
    for (let i = 0; i < guessHierarchy.length || i < expectedHierarchy.length; ++i) {
      const g = guessHierarchy[i]
      const c = expectedHierarchy[i]

      if (!mismatched && g?.id == c?.id) {
        minRank = g.rank_level
      } else if (g && c && g?.id !== c?.id) {
        mismatched = true
        break
      }
    }

    const t = 1 - Math.min(1, Math.max(0, (minRank - 10) / (baseTaxon.rank_level - 10)))
    const baseScore = 100 * Math.pow(t, 1.25)
    return Math.round(!mismatched ? baseScore : baseScore / 2)
  }

  function restart() {
    setGames(x => x + 1)
    setTotalScore(x => x + calcScore())
    setGuessTaxonId(BOUND_TAXON_ID)
    setSubmitted(false)
  }

  const answerSheet = function*() {
    const guessHierarchy = [...(guessTaxon.ancestors ?? []), guessTaxon].filter(t => t.rank_level <= baseTaxon.rank_level)
    const expectedHierarchy = [...(expectedTaxon.ancestors ?? []), expectedTaxon].filter(t => t.rank_level <= baseTaxon.rank_level)

    let mismatched = false
    for (let i = 0; i < guessHierarchy.length || i < expectedHierarchy.length; ++i) {
      const g = guessHierarchy[i]
      const c = expectedHierarchy[i]

      if (!mismatched && g?.id == c?.id) {
        // match, one column
        yield <div
          key={`${i}`}
          className="Taxon Taxon--match"
        >
          <TaxonLabel
            taxon={g}
          />
        </div>
      } else {
        if (g && c && g?.id !== c?.id) mismatched = true

        // two columns
        if (g) {
          yield <div
            key={`${i}g`}
            className={`Taxon Taxon--${mismatched ? "badguess" : "extraguess"}`}
          >
            <TaxonLabel
              taxon={g}
            />
          </div>
        }

        if (c) {
          yield <div
            key={`${i}c`}
            className="Taxon Taxon--expected"
          >
            <TaxonLabel
              taxon={c}
            />
          </div>
        }
      }
    }
  }

  return (
    obs && guessTaxon && expectedTaxon &&
    <main>
      <ShowObservation observation={obs} />

      <section className="Taxle">
        {!submitted ? <div className="Taxle__hierarchy">
          {guessTaxon.ancestors?.filter(t => t.rank_level <= baseTaxon.rank_level).map(taxon =>
            <div
              key={taxon.id}
              className="Taxon"
              role="button"
              onClick={() => setGuessTaxonId(taxon.id!)}
            >
              <TaxonLabel
                taxon={taxon}
              />
            </div>
          )}
          <div
            className="Taxon"
          >
            <TaxonLabel
              taxon={guessTaxon}
            />
          </div>

          <button
            onClick={() => setSubmitted(true)}
          >
            Submit
          </button>

          <hr />

          <SearchTaxa
            subtaxa={guessTaxon.children ?? []}
            setGuessTaxonId={setGuessTaxonId}
          />
        </div> : <>
          <div className="Taxle__answersheet">
            {Array.from(answerSheet())}


          </div>

          <hr />

          <button
            className="reset"
            onClick={restart}
          >
            Play again
          </button>

          <p>
            <strong>Score: {calcScore()}</strong>
          </p>
          {games > 1 && <p>
            Sum: {totalScore + calcScore()} over {games} rounds
          </p>}
        </>}
      </section>
    </main>
  );
}

export function App() {
  return <>
    <h1>Taxle!</h1>
    <Taxle />
    <hr />
    <footer>
      <p>
        All data from <a href="https://www.inaturalist.org/">INaturalist</a>.
      </p>
    </footer>
  </>
}
