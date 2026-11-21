import maplibre from 'maplibre-gl';
import { CollegeAtlas } from '../features/college-atlas/CollegeAtlas.jsx';
export default function AtlasView() {
  return <section aria-label="Boston map" className="atlas-view">
    <div className="section-head"><div><span className="section-kicker">LIVE MAP · GREATER BOSTON</span><h1>Boston, mapped.</h1><p>Find your campus, follow the T, and get to know the city around it.</p></div></div>
    <CollegeAtlas maplibre={maplibre}/>
  </section>;
}
