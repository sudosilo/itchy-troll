// NOTA CITY - src/App.jsx
// The root component. Sets up routing between all six pages.
// The nav bar appears on every page. Clicking a link swaps the page content
// without reloading — this is called client-side routing.

import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Overview from './pages/Overview'
import Zones from './pages/Zones'
import Roads from './pages/Roads'
import Power from './pages/Power'
import Water from './pages/Water'
import EventLog from './pages/EventLog'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="app">

        <header className="app-header">
          <h1>NOTA CITY</h1>
          <nav className="app-nav">
            <NavLink to="/">Overview</NavLink>
            <NavLink to="/zones">Zones</NavLink>
            <NavLink to="/roads">Roads</NavLink>
            <NavLink to="/power">Power</NavLink>
            <NavLink to="/water">Water</NavLink>
            <NavLink to="/log">Event Log</NavLink>
          </nav>
        </header>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/zones" element={<Zones />} />
            <Route path="/roads" element={<Roads />} />
            <Route path="/power" element={<Power />} />
            <Route path="/water" element={<Water />} />
            <Route path="/log" element={<EventLog />} />
          </Routes>
        </main>

      </div>
    </BrowserRouter>
  )
}

export default App
