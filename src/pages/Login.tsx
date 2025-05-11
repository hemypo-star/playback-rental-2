
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { login } from '@/services/authService';
import { Label } from '@/components/ui/label';
import { AlertVariant, AlertTitle, AlertDescription } from '@/components/ui/alert-variant';

const formSchema = z.object({
  username: z.string().min(1, { message: 'Email обязателен' }),
  password: z.string().min(1, { message: 'Пароль обязателен' }),
});

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [adminHelp, setAdminHelp] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Get the return URL from location state
  const from = location.state?.from?.pathname || '/admin';

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setLoginError(null);
    
    try {
      const result = await login(values.username, values.password);
      
      if (result.success) {
        toast({
          title: 'Вход выполнен успешно',
          description: 'Добро пожаловать в админ-панель.',
        });
        navigate(from, { replace: true });
      } else {
        setLoginError(result.error || 'Неверный логин или пароль. Пожалуйста, попробуйте снова.');
        toast({
          variant: 'destructive',
          title: 'Ошибка входа',
          description: result.error || 'Неверный логин или пароль. Пожалуйста, попробуйте снова.',
        });
      }
    } catch (error: any) {
      setLoginError(error.message || 'Произошла ошибка при попытке входа.');
      toast({
        variant: 'destructive',
        title: 'Ошибка входа',
        description: error.message || 'Произошла ошибка при попытке входа.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Вход в систему</CardTitle>
          <CardDescription>
            Введите ваши учетные данные для доступа к админ-панели
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loginError && (
            <AlertVariant variant="destructive" className="mb-4">
              <AlertTitle>Ошибка входа</AlertTitle>
              <AlertDescription>{loginError}</AlertDescription>
            </AlertVariant>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email/логин</FormLabel>
                    <FormControl>
                      <Input placeholder="admin@example.com или admin" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Пароль</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Выполняется вход...' : 'Войти'}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col">
          <p className="text-sm text-muted-foreground mt-2">
            Вы можете использовать как email из Supabase Auth, так и логин 'admin'
          </p>
          <Button 
            variant="ghost" 
            className="text-sm text-muted-foreground mt-2"
            onClick={() => setAdminHelp(!adminHelp)}
          >
            Нужна помощь?
          </Button>
          
          {adminHelp && (
            <AlertVariant variant="info" className="mt-3">
              <AlertTitle>Информация об авторизации</AlertTitle>
              <AlertDescription>
                <p className="mb-2">Для входа требуется:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Аккаунт в Supabase Authentication</li>
                  <li>Запись в таблице admin_users со значением "admin" в поле login</li>
                  <li>Введите "admin" в поле Email/логин и ваш пароль для входа</li>
                </ul>
              </AlertDescription>
            </AlertVariant>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
