import { render } from "preact";
import { LocationProvider, Router, Route } from "preact-iso";

import { Home } from "./pages/Home/index";
import { NotFound } from "./pages/_404";
import "./style.css";

export function App() {
  webflow.setExtensionSize("comfortable");
  return (
    <LocationProvider>
      <div className="bg-background antialiased">
        <Router>
          <Route path="/" component={Home} />
          <Route default component={NotFound} />
        </Router>
      </div>
    </LocationProvider>
  );
}

render(<App />, document.getElementById("app"));
