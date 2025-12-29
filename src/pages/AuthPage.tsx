import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Mail, Lock, User as UserIcon, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { Layout } from '@/components/layout/Layout';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const updatePasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type SignInFormData = z.infer<typeof signInSchema>;
type SignUpFormData = z.infer<typeof signUpSchema>;
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>;

export default function AuthPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isPasswordResetMode, setIsPasswordResetMode] = useState(false);
  const [passwordUpdateSuccess, setPasswordUpdateSuccess] = useState(false);
  const { signIn, signUp, resetPassword, updatePassword, user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check for password reset mode from URL or auth event
  useEffect(() => {
    const checkForPasswordReset = async () => {
      // Check URL hash for recovery token (Supabase appends this)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type');
      
      if (type === 'recovery') {
        setIsPasswordResetMode(true);
        return;
      }

      // Also listen for PASSWORD_RECOVERY event
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordResetMode(true);
        }
      });

      return () => subscription.unsubscribe();
    };

    checkForPasswordReset();
  }, []);

  useEffect(() => {
    // Only redirect if user is logged in AND not in password reset mode
    if (!authLoading && user && !isPasswordResetMode) {
      const redirectTo = searchParams.get('redirect') || '/';
      navigate(redirectTo);
    }
  }, [user, authLoading, navigate, searchParams]);

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const updatePasswordForm = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const handleSignIn = async (data: SignInFormData) => {
    setIsLoading(true);
    const { error } = await signIn(data.email, data.password);
    setIsLoading(false);

    if (error) {
      signInForm.setError('root', {
        message: error.message === 'Invalid login credentials'
          ? 'Invalid email or password. Please try again.'
          : error.message,
      });
    }
  };

  const handleSignUp = async (data: SignUpFormData) => {
    setIsLoading(true);
    const { error } = await signUp(data.email, data.password, data.fullName);
    setIsLoading(false);

    if (error) {
      signUpForm.setError('root', { 
        message: 'Unable to create account. Please check your details and try again.' 
      });
    }
  };

  const handleForgotPassword = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    const { error } = await resetPassword(data.email);
    setIsLoading(false);

    if (error) {
      forgotPasswordForm.setError('root', {
        message: 'Unable to send reset email. Please try again.',
      });
    } else {
      setResetEmailSent(true);
    }
  };

  const handleBackToSignIn = () => {
    setShowForgotPassword(false);
    setResetEmailSent(false);
    forgotPasswordForm.reset();
  };

  const handleUpdatePassword = async (data: UpdatePasswordFormData) => {
    setIsLoading(true);
    const { error } = await updatePassword(data.password);
    setIsLoading(false);

    if (error) {
      updatePasswordForm.setError('root', {
        message: 'Unable to update password. Please try again.',
      });
    } else {
      setPasswordUpdateSuccess(true);
    }
  };

  const handlePasswordUpdateComplete = () => {
    setIsPasswordResetMode(false);
    setPasswordUpdateSuccess(false);
    // Clear the hash from URL
    window.history.replaceState(null, '', window.location.pathname);
    navigate('/');
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  // Show password update form when in reset mode
  if (isPasswordResetMode) {
    return (
      <Layout>
        <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <Card className="border-border/50 shadow-elegant">
              <CardHeader className="text-center pb-4">
                <CardTitle className="font-display text-2xl">
                  {passwordUpdateSuccess ? 'Password Updated!' : 'Set New Password'}
                </CardTitle>
                <CardDescription>
                  {passwordUpdateSuccess 
                    ? 'Your password has been successfully updated'
                    : 'Enter your new password below'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {passwordUpdateSuccess ? (
                  <div className="text-center space-y-4">
                    <div className="flex justify-center">
                      <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                    <p className="text-muted-foreground">
                      You can now sign in with your new password.
                    </p>
                    <Button 
                      className="w-full"
                      onClick={handlePasswordUpdateComplete}
                    >
                      Continue to Home
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={updatePasswordForm.handleSubmit(handleUpdatePassword)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="new-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="pl-10 pr-10"
                          {...updatePasswordForm.register('password')}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {updatePasswordForm.formState.errors.password && (
                        <p className="text-sm text-destructive">
                          {updatePasswordForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="confirm-new-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="pl-10"
                          {...updatePasswordForm.register('confirmPassword')}
                        />
                      </div>
                      {updatePasswordForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-destructive">
                          {updatePasswordForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>

                    {updatePasswordForm.formState.errors.root && (
                      <p className="text-sm text-destructive text-center p-3 bg-destructive/10 rounded-lg">
                        {updatePasswordForm.formState.errors.root.message}
                      </p>
                    )}

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Updating...' : 'Update Password'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="border-border/50 shadow-elegant">
            <CardHeader className="text-center pb-4">
              <CardTitle className="font-display text-2xl">
                {showForgotPassword ? 'Reset Password' : 'Welcome'}
              </CardTitle>
              <CardDescription>
                {showForgotPassword 
                  ? 'Enter your email to receive a password reset link'
                  : 'Sign in to your account or create a new one'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {showForgotPassword ? (
                resetEmailSent ? (
                  <div className="text-center space-y-4">
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-lg">
                      <p className="font-medium">Check your email!</p>
                      <p className="text-sm mt-1">We've sent a password reset link to your email address.</p>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleBackToSignIn}
                    >
                      Back to Sign In
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="forgot-email"
                          type="email"
                          placeholder="your@email.com"
                          className="pl-10"
                          {...forgotPasswordForm.register('email')}
                        />
                      </div>
                      {forgotPasswordForm.formState.errors.email && (
                        <p className="text-sm text-destructive">
                          {forgotPasswordForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    {forgotPasswordForm.formState.errors.root && (
                      <p className="text-sm text-destructive text-center p-3 bg-destructive/10 rounded-lg">
                        {forgotPasswordForm.formState.errors.root.message}
                      </p>
                    )}

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Sending...' : 'Send Reset Link'}
                    </Button>

                    <Button 
                      type="button"
                      variant="ghost" 
                      className="w-full"
                      onClick={handleBackToSignIn}
                    >
                      Back to Sign In
                    </Button>
                  </form>
                )
              ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="your@email.com"
                          className="pl-10"
                          {...signInForm.register('email')}
                        />
                      </div>
                      {signInForm.formState.errors.email && (
                        <p className="text-sm text-destructive">
                          {signInForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signin-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="pl-10 pr-10"
                          {...signInForm.register('password')}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {signInForm.formState.errors.password && (
                        <p className="text-sm text-destructive">
                          {signInForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    {signInForm.formState.errors.root && (
                      <p className="text-sm text-destructive text-center p-3 bg-destructive/10 rounded-lg">
                        {signInForm.formState.errors.root.message}
                      </p>
                    )}

                    <div className="flex justify-end">
                      <Button 
                        type="button"
                        variant="link" 
                        className="px-0 text-sm text-muted-foreground hover:text-primary"
                        onClick={() => setShowForgotPassword(true)}
                      >
                        Forgot password?
                      </Button>
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Signing in...' : 'Sign In'}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="John Doe"
                          className="pl-10"
                          {...signUpForm.register('fullName')}
                        />
                      </div>
                      {signUpForm.formState.errors.fullName && (
                        <p className="text-sm text-destructive">
                          {signUpForm.formState.errors.fullName.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="your@email.com"
                          className="pl-10"
                          {...signUpForm.register('email')}
                        />
                      </div>
                      {signUpForm.formState.errors.email && (
                        <p className="text-sm text-destructive">
                          {signUpForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="pl-10 pr-10"
                          {...signUpForm.register('password')}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {signUpForm.formState.errors.password && (
                        <p className="text-sm text-destructive">
                          {signUpForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-confirm"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="pl-10"
                          {...signUpForm.register('confirmPassword')}
                        />
                      </div>
                      {signUpForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-destructive">
                          {signUpForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>

                    {signUpForm.formState.errors.root && (
                      <p className="text-sm text-destructive text-center p-3 bg-destructive/10 rounded-lg">
                        {signUpForm.formState.errors.root.message}
                      </p>
                    )}

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Creating account...' : 'Create Account'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
}
