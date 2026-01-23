import axios from 'axios';
import { useState } from 'react';

axios.defaults.withCredentials = true;



const LoginBar = ({onLogin}) =>{
    //const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    //the states below are needed to track the logged in user and render it in the parent component via onLogin
    const [success, setSuccess] = useState(false);
    const [userName, setUserName] = useState('');
    const [password, setPassword] = useState('');

    //handle github authorization login. After the user clicks login and we know the email exists in the database
    const handleGithubLogin= async (e)=>{
        e.preventDefault(); //I think this was the problem of http://localhost:5000/api/auth/me not authorizing???
        setError('');
        if(!userName){
            setError('Please enter your username');
            return;
        }

        if(!password){
            setError('Please enter your password');
            return;
        }else{
            ///check password
            try{
                console.log(process.env.REACT_APP_API_HOST);
                const res = await axios.post(process.env.REACT_APP_API_HOST+'/login', { userName, password});
                if(res.data && res.data.user){
                    //basic login 
                    //console.log('onLogin called with:', res.data.user.name);
                    onLogin(res.data.user);
                    //setUserName(res.data.user.name);
                    setSuccess(true);
                    //if login is successful... there exists a response and a user found in db
                    //PASS THE EMAIL AS A STATE PARAM VIA URL TO PASSPORT STRATEGY      
                    //DEACTIVATED FEATURE  
                    // const url = `${process.env.REACT_APP_API_HOST}/auth/github?state=${encodeURIComponent(email)}`;
                    // window.location.href = url;
                }else{
                    setError('Password incorrect');
                    return;
                }

            }catch(err){
                setError('Wrong username or password');
            }

        }
    };

    // Modernized login form styling
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)'
        }}>
            <form onSubmit={handleGithubLogin}
                style={{
                    background: '#fff',
                    padding: '2.5rem 2rem',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(60, 72, 88, 0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: '340px',
                    gap: '1.5rem'
                }}
            >
                <h2 style={{
                    margin: 0,
                    fontWeight: 700,
                    fontSize: '1.7rem',
                    color: '#3730a3',
                    letterSpacing: '0.02em'
                }}>
                    Student Portal Login
                </h2>
                <input 
                    type="username"
                    placeholder="your username"
                    value={userName}
                    onChange={e => setUserName(e.target.value.trim())} //change useState of email
                    required
                    style={{
                        padding: '0.75rem 1rem',
                        width: '100%',
                        borderRadius: '8px',
                        border: '1px solid #c7d2fe',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        boxSizing: 'border-box'
                    }}
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    style={{
                        padding: '0.75rem 1rem',
                        width: '100%',
                        borderRadius: '8px',
                        border: '1px solid #c7d2fe',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        boxSizing: 'border-box'
                    }}
                />
                {/* <button type="submit" style={{ padding: '8px 16px' }}>Login</button> */}
                <button type="submit"
                    style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'linear-gradient(90deg, #6366f1 0%, #818cf8 100%)',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '1.1rem',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.15)',
                        transition: 'background 0.2s'
                    }}
                >
                    Login
                </button>
                {error && <span style={{ color: 'red', fontWeight: 500, fontSize: '1rem', marginTop: '-1rem' }}>{error}</span>}
                {success && (
                    <p style={{
                        marginTop: '1rem',
                        color: '#22c55e',
                        fontWeight: 600,
                        fontSize: '1.05rem'
                    }}>
                        Successful Login. Welcome <strong>{userName}</strong>
                    </p>
                )}
            </form>
        </div>
    );
};

export default LoginBar;

//OLD LOGIN
    // const handleLogin = async (e)=>{
    //     e.preventDefault();
    //     setError('');
    //     try{
            
    //         const res = await axios.post(apiUrl, {email});
    //         //console.log(res.data);
    //         if(res.data && res.data.user){ //if the data exists and there exists a user with that email
    //             //function prop which passes the user object 
    //             //{ id: 1, name: "Alice", email: "alice@school.com" }to the handleLog function
                
    //             //console.log('onLogin called with:', res.data.user.name);
       

    //             onLogin(res.data.user); //PASS USER DATA TO APP.JS (PARENT COMPONENT)
    //             setUserName(res.data.user.name);
    //             setSuccess(true);
    //         }else{
    //             setError('User not found');
    //         }
    //     }catch(err){
    //             setError(err.response?.data?.error || 'Login failed');
    //     }
    // };
