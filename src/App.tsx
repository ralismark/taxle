import './App.css'
import { useContext, useEffect, useState } from 'react';
import { ShowObservation } from './ShowObservation';
import * as INat from './api'
import { GamemodeContext, getObservation } from './gamemode';
import { TaxonLabel } from './TaxonLabel';

export function SearchTaxa(props: {
  subtaxa: INat.Taxon[],
  setGuessTaxonId: (id: number) => void,
}) {
  const gamemode = useContext(GamemodeContext)
  const [input, setInput] = useState("")

  const autocomplete = INat.taxa_autocomplete.use({ q: input }, [input])
  const suggestions = input == "" ? props.subtaxa : (autocomplete ?? []).filter(t => {
    return gamemode.rootTaxon.id === INat.TAXON_LIFE.id || t.ancestor_ids.includes(gamemode.rootTaxon.id)
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
  const gamemode = useContext(GamemodeContext)

  const [submitted, setSubmitted] = useState(false)
  const [games, setGames] = useState(1)
  const [totalScore, setTotalScore] = useState(0)

  const [obs, setObs] = useState<INat.Observation | null>(null)
  useEffect(() => {
    getObservation(gamemode).then(setObs)
  }, [games])

  const [guessTaxonId, setGuessTaxonId] = useState(gamemode.rootTaxon.id)
  const guessTaxon = INat.taxa_details.use(guessTaxonId, [guessTaxonId])
  const expectedTaxon = INat.taxa_details.use(obs?.taxon?.id ?? 1, [obs])

  if (!obs || !guessTaxon || !expectedTaxon) return <main>loading...</main>

  console.log(
    "observation", obs,
    "taxonomy", expectedTaxon?.ancestors?.map(x => x.preferred_common_name ?? x.name)
  )

  const calcScore = () => {
    const guessHierarchy = [...(guessTaxon.ancestors ?? []), guessTaxon].filter(t => t.rank_level <= gamemode.rootTaxon.rank_level)
    const expectedHierarchy = [...(expectedTaxon.ancestors ?? []), expectedTaxon].filter(t => t.rank_level <= gamemode.rootTaxon.rank_level)

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

    const t = 1 - Math.min(1, Math.max(0, (minRank - 10) / (gamemode.rootTaxon.rank_level - 10)))
    const baseScore = 100 * Math.pow(t, 1.25)
    return Math.round(!mismatched ? baseScore : baseScore / 2)
  }

  function restart() {
    setGames(x => x + 1)
    setTotalScore(x => x + calcScore())
    setGuessTaxonId(gamemode.rootTaxon.id)
    setSubmitted(false)
  }

  const answerSheet = function*() {
    const guessHierarchy = [...(guessTaxon.ancestors ?? []), guessTaxon].filter(t => t.rank_level <= gamemode.rootTaxon.rank_level)
    const expectedHierarchy = [...(expectedTaxon.ancestors ?? []), expectedTaxon].filter(t => t.rank_level <= gamemode.rootTaxon.rank_level)

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
          {guessTaxon.ancestors?.filter(t => t.rank_level <= gamemode.rootTaxon.rank_level).map(taxon =>
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

          <hr />


          <button
            onClick={() => setSubmitted(true)}
          >
            Submit
          </button>

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
