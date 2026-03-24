import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import axios from 'axios';
// import reportWebVitals from './reportWebVitals';


//you need to pass the cookies from frontend to backend since they live on different origins in production
axios.defaults.withCredentials = true;

if (process.env.NODE_ENV === 'production') {
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
  // keep warn/error if you still want to see issues
}


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

//reportWebVitals();