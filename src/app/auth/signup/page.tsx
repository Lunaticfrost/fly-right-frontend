'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ValidationErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function SignUpPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const router = useRouter()

  const validateName = (name: string): string | undefined => {
    if (!name) return "Full name is required";
    if (name.trim().length < 2) return "Name must be at least 2 characters long";
    if (name.trim().length > 50) return "Name must be less than 50 characters";
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!nameRegex.test(name.trim())) return "Name can only contain letters and spaces";
    return undefined;
  };

  const validateEmail = (email: string): string | undefined => {
    if (!email) return "Email is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Please enter a valid email address";
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) return "Password is required";
    if (password.length < 8) return "Password must be at least 8 characters long";
    if (!/(?=.*[a-z])/.test(password)) return "Password must contain at least one lowercase letter";
    if (!/(?=.*[A-Z])/.test(password)) return "Password must contain at least one uppercase letter";
    if (!/(?=.*\d)/.test(password)) return "Password must contain at least one number";
    return undefined;
  };

  const validateConfirmPassword = (confirmPassword: string): string | undefined => {
    if (!confirmPassword) return "Please confirm your password";
    if (confirmPassword !== password) return "Passwords do not match";
    return undefined;
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    
    const nameError = validateName(name);
    if (nameError) errors.name = nameError;
    
    const emailError = validateEmail(email);
    if (emailError) errors.email = emailError;
    
    const passwordError = validatePassword(password);
    if (passwordError) errors.password = passwordError;
    
    const confirmPasswordError = validateConfirmPassword(confirmPassword);
    if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    if (validationErrors.name) {
      const error = validateName(value);
      setValidationErrors(prev => ({
        ...prev,
        name: error
      }));
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (validationErrors.email) {
      const error = validateEmail(value);
      setValidationErrors(prev => ({
        ...prev,
        email: error
      }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (validationErrors.password) {
      const error = validatePassword(value);
      setValidationErrors(prev => ({
        ...prev,
        password: error
      }));
    }
    // Also validate confirm password when password changes
    if (confirmPassword && validationErrors.confirmPassword) {
      const confirmError = validateConfirmPassword(confirmPassword);
      setValidationErrors(prev => ({
        ...prev,
        confirmPassword: confirmError
      }));
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfirmPassword(value);
    if (validationErrors.confirmPassword) {
      const error = validateConfirmPassword(value);
      setValidationErrors(prev => ({
        ...prev,
        confirmPassword: error
      }));
    }
  };

  const handleSignUp = async () => {
    setError('')
    
    if (!validateForm()) {
      return;
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name.trim(),
          },
        },
      })

      if (error) {
        setError(error.message)
      } else if (data.user) {
        // Create user profile
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: data.user.id,
              name: name.trim(),
              email: email,
            },
          ])

        if (profileError) {
          console.error('Profile creation error:', profileError)
        }

        router.push('/')
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <span className="text-2xl">✈️</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Join FlyRight</h1>
          <p className="text-gray-600">Create your account to start booking flights</p>
        </div>

        {/* Sign Up Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleSignUp(); }} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                  validationErrors.name ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                }`}
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={handleNameChange}
                onBlur={() => {
                  const error = validateName(name);
                  setValidationErrors(prev => ({ ...prev, name: error }));
                }}
                required
              />
              {validationErrors.name && (
                <p className="text-red-600 text-sm mt-1">{validationErrors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                  validationErrors.email ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                }`}
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={handleEmailChange}
                onBlur={() => {
                  const error = validateEmail(email);
                  setValidationErrors(prev => ({ ...prev, email: error }));
                }}
                required
              />
              {validationErrors.email && (
                <p className="text-red-600 text-sm mt-1">{validationErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password *
              </label>
              <input
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                  validationErrors.password ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                }`}
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={handlePasswordChange}
                onBlur={() => {
                  const error = validatePassword(password);
                  setValidationErrors(prev => ({ ...prev, password: error }));
                }}
                required
                minLength={8}
              />
              {validationErrors.password && (
                <p className="text-red-600 text-sm mt-1">{validationErrors.password}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Password must be at least 8 characters with uppercase, lowercase, and number
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password *
              </label>
              <input
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                  validationErrors.confirmPassword ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                }`}
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                onBlur={() => {
                  const error = validateConfirmPassword(confirmPassword);
                  setValidationErrors(prev => ({ ...prev, confirmPassword: error }));
                }}
                required
              />
              {validationErrors.confirmPassword && (
                <p className="text-red-600 text-sm mt-1">{validationErrors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || Object.keys(validationErrors).length > 0}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating Account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-4 text-sm text-gray-500">or</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-gray-600">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
