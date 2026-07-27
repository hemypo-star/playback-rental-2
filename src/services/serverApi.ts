const API_BASE_URL = import.meta.env.VITE_API_URL;

interface OrderWebhookData {
  orderId: string;
  name: string;
  email: string;
  phone: string;
  items: Array<{
    productId?: string;
    title: string;
    price: number;
    quantity: number;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    totalPrice?: number;
  }>;
  totalAmount: number;
  currency?: string;
}

interface OrderWebhookResponse {
  success: boolean;
  message: string;
  orderId?: string;
  webhookStatus?: number;
  webhookResponse?: unknown;
  error?: string;
  details?: unknown;
}

interface BackupResponse {
  success: boolean;
  message: string;
  filename?: string;
  error?: string;
}

const apiCall = async <T = any>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    },
    mode: 'cors',
    credentials: 'same-origin',
    ...options,
  };

  try {
    console.log(`Making HTTP API call to: ${url}`);
    const response = await fetch(url, defaultOptions);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || errorData?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API call failed to ${url}:`, error);
    throw error;
  }
};

export const sendOrderWebhook = async (data: OrderWebhookData): Promise<OrderWebhookResponse> => {
  console.log('Sending order JSON to webhook through server API...');

  return apiCall<OrderWebhookResponse>('/notifications/checkout', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// Storage management services
export const ensureStorageBucket = async (bucketName: string): Promise<{ success: boolean; message: string }> => {
  console.log(`Ensuring storage bucket ${bucketName} exists...`);

  return apiCall('/storage/ensure-bucket', {
    method: 'POST',
    body: JSON.stringify({ bucketName }),
  });
};

// Backup services
export const createBackup = async (type: 'database' | 'storage' | 'full'): Promise<BackupResponse | void> => {
  console.log(`Creating ${type} backup...`);

  try {
    const response = await fetch(`${API_BASE_URL}/backup/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `backup-${Date.now()}`;

    if (contentDisposition) {
      const matches = contentDisposition.match(/filename="(.+)"/);
      if (matches) {
        filename = matches[1];
      }
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('Backup downloaded successfully');
  } catch (error) {
    console.error('Error creating backup:', error);
    throw error;
  }
};

export const sendOrderWebhookDirect = async (orderData: any) => {
  const webhookUrl = import.meta.env.VITE_ORDER_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error('VITE_ORDER_WEBHOOK_URL is not configured');
  }

  const payload = {
    event: 'order.created',
    source: 'playback-rental',
    createdAt: new Date().toISOString(),
    ...orderData,
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Webhook failed: HTTP ${response.status} ${errorText}`);
  }

  return {
    success: true,
  };
};