import { useEffect, useState } from 'react';
import './App.css';
import AdminDashboard from './features/admin/pages/AdminDashboard.jsx';
import LoginBar from './shared/LoginBar.jsx';
import StudentDashboard from './features/student/pages/StudentDashboard.jsx';

function App() {
  //set the current user in Parent compontnet (this app.js)
  const [user, setUser] = useState(null);
  
  const handleLogin=(userData)=>{
    setUser(userData); 
    console.log('User logged in:',userData);
  };

  const handleLogout= async ()=>{
    //you need to make a post request because according to HTTP, actions that change 
    //the server state should use POST, not GET
    //also passport/express-session expects POST
   // await axios.post(`${process.env.REACT_APP_API_HOST}/auth/logout`,{},{withCredentials:true});
    setUser(null);
  }

  useEffect(()=>{ //everytime the user changes, useEffect() is called
    // console.log('All env vars:', process.env);
    if(user){
      console.log('current user is ',user.name);
    }else{
      console.log('User is null');
    }
    
  },[user]);



//when you call onLogin(res.data.user) in LoginBar, 
// the handleLogin function in App.js is executed, and userData is set to 
// res.data.user.
  
  return (
    <div className="App">
      {user && <h2>{user.section?.name}</h2>}

      {!user && (
        <div>
          <LoginBar onLogin={handleLogin} />
        </div>
      )}

      {user && user.role ==='student' && (
        <StudentDashboard user={user} onLogout={handleLogout} />
      )}

      {user && user.role === 'admin' &&(
        <AdminDashboard user={user} 
                        onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App;
