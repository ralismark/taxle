import './TaxonLabel.css'
import * as INat from './api'

export function TaxonLabel(props: {
  taxon: INat.Taxon,
}) {
  return <span
    className={`TaxonLabel ${props.taxon.rank_level % 10 !== 0 ? "TaxonLabel--minor" : ""}`}
    data-rank={props.taxon.rank_level}
    title={`id:${props.taxon.id} rank-level:${props.taxon.rank_level}`}
  >
    {props.taxon.preferred_common_name
      ? <>{props.taxon.preferred_common_name} <small>({props.taxon.rank} {props.taxon.name})</small></>
      : <>{props.taxon.name} <small>({props.taxon.rank})</small></>
    }
  </span>
}
