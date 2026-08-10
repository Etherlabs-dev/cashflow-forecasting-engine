import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Scenarios } from './pages/Scenarios';
import { WorkingCapital } from './pages/WorkingCapital';
import { CaseStudy } from './pages/CaseStudy';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/scenarios" element={<Scenarios />} />
        <Route path="/working-capital" element={<WorkingCapital />} />
        <Route path="/case-study" element={<CaseStudy />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
