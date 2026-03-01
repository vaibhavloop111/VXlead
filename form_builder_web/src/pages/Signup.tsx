import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Auth.css';

const Signup: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [accessCode, setAccessCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Verify Access Code
            const { data: codeData, error: codeError } = await supabase
                .from('access_codes')
                .select('*')
                .eq('code', accessCode.trim())
                .eq('is_active', true)
                .single();

            if (codeError || !codeData) {
                setError('Invalid or inactive Admin Access Code.');
                setLoading(false);
                return;
            }

            // 2. Proceed with Signup
            const { error: signupError } = await supabase.auth.signUp({ email, password });

            if (signupError) {
                setError(signupError.message);
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>Create Account</h1>
                <p className="auth-subtitle">Start managing your leads and forms</p>

                <form onSubmit={handleSignup}>
                    <div className="input-group">
                        <label>Admin Access Code</label>
                        <input
                            type="text"
                            value={accessCode}
                            onChange={(e) => setAccessCode(e.target.value)}
                            placeholder="Enter secret code"
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && <div className="auth-error">{error}</div>}

                    <button type="submit" className="auth-button" disabled={loading}>
                        {loading ? 'Creating account...' : 'Create Admin Account'}
                    </button>
                </form>

                <p className="auth-footer">
                    Already have an account? <span onClick={() => navigate('/login')}>Login</span>
                </p>
            </div>
        </div>
    );
};

export default Signup;
