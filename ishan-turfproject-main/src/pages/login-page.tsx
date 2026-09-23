import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const forgotSchema = z.object({
  email: z.string().email('Invalid email address'),
})

type LoginFormData = z.infer<typeof loginSchema>
type ForgotFormData = z.infer<typeof forgotSchema>

type View = 'login' | 'forgot' | 'sent'

export function LoginPage() {
  const [view, setView] = useState<View>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sentEmail, setSentEmail] = useState('')
  const { signIn, resetPassword } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const forgotForm = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  })

  const handleLogin = async (data: LoginFormData) => {
    setLoading(true)
    try {
      await signIn(data.email, data.password)
      toast({
        title: 'Welcome back!',
        description: 'You have successfully signed in.',
      })
      navigate('/dashboard')
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Sign in failed',
        description: error instanceof Error ? error.message : 'Please check your credentials',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (data: ForgotFormData) => {
    setLoading(true)
    try {
      await resetPassword(data.email)
      setSentEmail(data.email)
      setView('sent')
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Reset failed',
        description: error instanceof Error ? error.message : 'Could not send reset email. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 40 : -40,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -40 : 40,
      opacity: 0,
    }),
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-8 h-8 text-primary-foreground"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </motion.div>
          <h1 className="text-2xl font-bold tracking-tight">Turf POS</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Owner &amp; Admin Panel
          </p>
        </div>

        <Card className="border-0 shadow-soft-lg overflow-hidden">
          <AnimatePresence mode="wait" initial={false} custom={view === 'login' ? -1 : 1}>

            {/* ── LOGIN VIEW ── */}
            {view === 'login' && (
              <motion.div
                key="login"
                custom={-1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                <CardHeader className="space-y-1 pb-4">
                  <CardTitle className="text-xl text-center">Owner Sign In</CardTitle>
                  <CardDescription className="text-center">
                    Enter your credentials to access the admin panel
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="admin@example.com"
                          className="pl-10"
                          {...loginForm.register('email')}
                        />
                      </div>
                      {loginForm.formState.errors.email && (
                        <p className="text-xs text-destructive">
                          {loginForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <button
                          type="button"
                          onClick={() => {
                            forgotForm.setValue('email', loginForm.getValues('email'))
                            setView('forgot')
                          }}
                          className="text-xs text-primary hover:underline font-medium transition-colors"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          className="pl-10 pr-10"
                          {...loginForm.register('password')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {loginForm.formState.errors.password && (
                        <p className="text-xs text-destructive">
                          {loginForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRight className="mr-2 h-4 w-4" />
                      )}
                      Sign in to Admin Panel
                    </Button>
                  </form>
                </CardContent>
              </motion.div>
            )}

            {/* ── FORGOT PASSWORD VIEW ── */}
            {view === 'forgot' && (
              <motion.div
                key="forgot"
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                <CardHeader className="space-y-1 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <button
                      type="button"
                      onClick={() => setView('login')}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1 -ml-1 rounded-md hover:bg-muted"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <CardTitle className="text-xl">Reset Password</CardTitle>
                  </div>
                  <CardDescription>
                    Enter your email and we'll send you a link to reset your password.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={forgotForm.handleSubmit(handleForgotPassword)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">Email address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="forgot-email"
                          type="email"
                          placeholder="admin@example.com"
                          className="pl-10"
                          {...forgotForm.register('email')}
                        />
                      </div>
                      {forgotForm.formState.errors.email && (
                        <p className="text-xs text-destructive">
                          {forgotForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <KeyRound className="mr-2 h-4 w-4" />
                      )}
                      Send Reset Link
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => setView('login')}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Sign In
                    </Button>
                  </form>
                </CardContent>
              </motion.div>
            )}

            {/* ── EMAIL SENT VIEW ── */}
            {view === 'sent' && (
              <motion.div
                key="sent"
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                <CardHeader className="space-y-1 pb-4 text-center">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="flex justify-center mb-2"
                  >
                    <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                  </motion.div>
                  <CardTitle className="text-xl">Check your email</CardTitle>
                  <CardDescription>
                    We've sent a password reset link to{' '}
                    <span className="font-medium text-foreground">{sentEmail}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground text-center">
                    Didn't receive the email? Check your spam folder, or try again with a different address.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      forgotForm.reset()
                      setView('forgot')
                    }}
                  >
                    Try a different email
                  </Button>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => {
                      loginForm.reset()
                      forgotForm.reset()
                      setView('login')
                    }}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Sign In
                  </Button>
                </CardContent>
              </motion.div>
            )}

          </AnimatePresence>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Restricted access — authorized personnel only
        </p>
      </motion.div>
    </div>
  )
}
