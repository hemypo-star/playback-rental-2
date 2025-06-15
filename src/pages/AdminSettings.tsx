
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

const AdminSettings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Настройки</h1>
        <p className="text-muted-foreground">
          Управление системными настройками и конфигурацией
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Общие настройки</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site-name">Название сайта</Label>
              <Input id="site-name" defaultValue="PlayBack Rental" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-description">Описание сайта</Label>
              <Input id="site-description" defaultValue="Аренда профессионального оборудования" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">Email для связи</Label>
              <Input id="contact-email" type="email" defaultValue="PlaybackRental@yandex.ru" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Настройки уведомлений</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email уведомления</Label>
                <p className="text-sm text-muted-foreground">
                  Отправлять уведомления о новых заказах на email
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Telegram уведомления</Label>
                <p className="text-sm text-muted-foreground">
                  Отправлять уведомления в Telegram
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Настройки безопасности</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="session-timeout">Время сессии (минуты)</Label>
              <Input id="session-timeout" type="number" defaultValue="60" />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Двухфакторная аутентификация</Label>
                <p className="text-sm text-muted-foreground">
                  Включить 2FA для администраторов
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button>Сохранить настройки</Button>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
