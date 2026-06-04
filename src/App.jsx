import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import GrainCanvas from './components/Common/GrainCanvas';
import CustomCursor from './components/Common/CustomCursor';
import Home from './components/Home/Home';
import SignIn from './components/SignIn/SignIn';
import SignUp from './components/SignUp/SignUp';
import Dashboard from './components/Dashboard/Dashboard';
import TaskDetail from './components/Tasks/TaskDetail';

function App() {
  return (
    <Router>
      {/* Global Theme Overlays */}
      <GrainCanvas />
      <CustomCursor />

      {/* Page Routing */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tasks/:taskId" element={<TaskDetail />} />
      </Routes>
    </Router>
  );
}

export default App;
