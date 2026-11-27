import './index.css';
import { StrictMode, use, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Gamemode, GamemodeContext, gamemodeFromQueryParams, GamemodeSelector, gamemodeToQueryParams } from './gamemode';
import { Taxle } from './App';

const presetGamemode = gamemodeFromQueryParams()

function Body() {
  const [phase, setPhase] = useState<"prepare" | "play">("prepare")

  const [gamemode, setGamemode] = useState<Gamemode>(use(presetGamemode))
  useEffect(() => {
    const url = new URL(location.href)
    url.search = ""
    const qp = gamemodeToQueryParams(gamemode)
    if (qp.size) url.search = `?${qp}`
    history.replaceState(null, "", url)
  }, [gamemode])

  if (phase == "prepare") {
    return <>
      <section className="Body__GamemodeSelector">
        <p>
          I want to try identify organisms:
        </p>

        <GamemodeSelector
          gamemode={gamemode}
          setGamemode={setGamemode}
        />

        <button onClick={() => setPhase("play")}>Play!</button>
      </section>
    </>
  } else if (phase == "play") {
    return <>
      <GamemodeContext.Provider value={gamemode}>
        <Taxle />
      </GamemodeContext.Provider>
    </>
  }
}

createRoot(document.body).render(
  <StrictMode>
    <header>
      <h1>
        <span className="TaxleLogo">Taxle!</span>
        <span className="__suffix">
          .<a href="https://kwellig.garden">kwellig.garden</a>
        </span>
      </h1>
    </header>

    <Body />

    <footer>
      <p>
        All data from <a href="https://www.inaturalist.org/">INaturalist</a>
      </p>
    </footer>
  </StrictMode>
)
