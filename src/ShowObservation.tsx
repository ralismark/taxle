import * as INat from './api'
import "./ShowObservation.css"

export function ShowObservation(props: { observation: INat.Observation }) {
  const obs = props.observation

  return <section className="ShowObservation">
    <div className="ShowObservation__carousel">
      {obs.photos && obs.photos.map(photo => (
        <img
          key={photo.id}
          src={photo.url?.replace(/[a-z]+(\.[a-z0-9.]+)$/, "original$1")}
        />
      ))}
    </div>

    <dl>
      {obs.place_guess && <>
        <dt>Where</dt>
        <dd>{obs.place_guess}</dd>
      </>}
      {obs.observed_on_string && <>
        <dt>When</dt>
        <dd>{obs.observed_on_string}</dd>
      </>}
    </dl>
  </section>
}
