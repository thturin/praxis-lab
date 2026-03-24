import React from 'react';
import AdminNavButtons from '../features/admin/components/AdminNavButtons';
import StudentNavButtons from '../features/student/components/StudentNavButtons';


const Navbar = ({ user, onSelect, onLogout, assignmentTitle, assignmentType, assignmentId, currentTab }) => {
    const isAdmin = user.role === 'admin';

    return (
        <nav style={{
            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
            padding: '16px 32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: '0 0 16px 16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            position: 'fixed',  // Fix navbar to top
            top: 0,            // Align to top
            left: 0,           // Align to left
            right: 0,          // Stretch across whole width
            zIndex: 1000      // Ensure navbar stays on top
        }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ fontWeight: '700', color: 'white', fontSize: '20px', marginRight: '24px' }}>
                    {isAdmin? 'Admin' : 'Student'} Portal
                </div>
                {/* Navigation Buttons */}
                {isAdmin ? 
                    <AdminNavButtons
                        onSelect={onSelect}
                        assignmentTitle={assignmentTitle}
                        assignmentType={assignmentType}
                        assignmentId={assignmentId}
                        currentTab={currentTab}
                    />
                    : <StudentNavButtons
                        onSelect={onSelect}
                        assignmentTitle={assignmentTitle}
                        assignmentType={assignmentType}
                        assignmentId={assignmentId}
                        currentTab={currentTab}
                    />
                }
            </div>
            {/* Logout Button */}
            <button
                style={{
                    background: '#fff',
                    color: '#ef4444',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 20px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '16px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}
                onClick={onLogout}
            >
                Logout
            </button>
        </nav>
    );
}

export default Navbar;
