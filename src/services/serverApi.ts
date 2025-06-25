
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://84.201.170.203:3001/api';

interface ContactNotificationData {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}

interface CheckoutNotificationData {
  name: string;
  email: string;
  phone: string;
  items: Array<{
    title: string;
    price: number;
    startDate: string;
    endDate: string;
  }>;
  totalAmount: number;
}

interface NotificationResponse {
  success: boolean;
  message: string;
  details?: any[];
  attemptedChats?: number;
  successfulChats?: number;
}

interface BackupResponse {
  success: boolean;
  message: string;
  filename?: string;
  error?: string;
}

// Generic API call helper with HTTP configuration
const apiCall = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
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
      throw new Error(errorData?.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API call failed to ${url}:`, error);
    throw error;
  }
};

// Telegram notification services
export const sendContactNotification = async (data: ContactNotificationData): Promise<NotificationResponse> => {
  console.log('Sending contact notification to server API...');
  return apiCall('/notifications/contact', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const sendCheckoutNotification = async (data: CheckoutNotificationData): Promise<NotificationResponse> => {
  console.log('Sending checkout notification to server API...');
  return apiCall('/notifications/checkout', {
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
export const createBackup = async (type: 'database' | 'storage' | 'full'): Promise<void> => {
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

    // Get filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `backup-${Date.now()}`;
    if (contentDisposition) {
      const matches = contentDisposition.match(/filename="(.+)"/);
      if (matches) {
        filename = matches[1];
      }
    }

    // Get the blob and create download
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

// Failed notifications retry
export const retryFailedNotifications = async (): Promise<{ success: boolean; processed: number }> => {
  console.log('Retrying failed notifications...');
  return apiCall('/notifications/retry-failed', {
    method: 'POST',
  });
};
