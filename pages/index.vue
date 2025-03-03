<template>
    <div class="min-h-screen bg-gray-100">
      <header class="bg-white shadow">
        <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 class="text-3xl font-bold text-gray-900">
            Soru Kayısı
          </h1>
        </div>
      </header>
  
      <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div class="bg-white shadow overflow-hidden sm:rounded-lg">
          <div class="px-4 py-5 sm:px-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900">
              Canlı Bağlantı Durumu
            </h3>
            <p class="mt-1 max-w-2xl text-sm text-gray-500">
              WebSocket bağlantısı ve aktif kullanıcılar hakkında bilgiler
            </p>
          </div>
          <div class="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div class="mb-4 flex items-center space-x-2">
              <div :class="connectionStatusClass" class="w-3 h-3 rounded-full"></div>
              <span class="text-lg font-semibold">{{ connectionStatusText }}</span>
            </div>
            
            <!-- Error message if any -->
            <div v-if="connectionError" class="mb-4 p-3 bg-red-100 text-red-800 rounded-lg">
              {{ connectionError }}
            </div>
            
            <!-- Detailed connection info -->
            <div v-if="connectionDetails" class="mb-4 p-3 bg-blue-50 text-blue-800 rounded-lg">
              <pre class="whitespace-pre-wrap text-xs">{{ connectionDetails }}</pre>
            </div>
            
            <!-- User counter large and centered -->
            <div class="mb-6 text-center">
              <div class="inline-block bg-blue-100 text-blue-800 px-6 py-3 rounded-lg">
                <div class="text-sm uppercase tracking-wide">Aktif Kullanıcı</div>
                <div class="text-4xl font-bold">{{ activeUsers }}/100</div>
              </div>
            </div>
            
            <!-- Connection details -->
            <div class="bg-gray-50 rounded-lg p-3 mt-2">
              <div class="grid grid-cols-2 gap-2">
                <div>Son ping zamanı:</div>
                <div>{{ lastPingTime || 'Henüz ping yok' }}</div>
                
                <div>Bağlantı süresi:</div>
                <div>{{ connectionDuration }}</div>
                
                <div>Son yeniden bağlanma:</div>
                <div>{{ lastReconnectTime || 'Yeniden bağlanma olmadı' }}</div>
                
                <div>Oturum ID:</div>
                <div>{{ sessionId || 'Bağlantı bekleniyor...' }}</div>

                <!-- Client Info -->
                <div>Tarayıcı:</div>
                <div>{{ browserInfo }}</div>
                
                <div>Cihaz:</div>
                <div>{{ deviceType }}</div>
              </div>
            </div>
            
            <!-- Manual reconnect button -->
            <div class="mt-4 text-center">
              <button 
                @click="reconnect" 
                class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
                :disabled="connectionStatus === 'connecting'"
              >
                {{ connectionStatus === 'connecting' ? 'Bağlanıyor...' : 'Yeniden Bağlan' }}
              </button>
            </div>
          </div>
        </div>
        
        <!-- Activity log -->
        <div class="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
          <div class="px-4 py-5 sm:px-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900">
              Bağlantı Günlüğü
            </h3>
          </div>
          <div class="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div class="max-h-40 overflow-y-auto">
              <div v-for="(log, index) in connectionLogs" :key="index" class="py-1 text-sm">
                <span class="text-gray-500">{{ log.time }}</span>
                <span :class="log.type === 'error' ? 'text-red-600' : (log.type === 'success' ? 'text-green-600' : 'text-gray-800')">
                  {{ log.message }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted } from 'vue'
  
  // State variables
  const connectionStatus = ref<'connecting' | 'connected' | 'disconnected'>('disconnected')
  const activeUsers = ref<number>(0)
  const ws = ref<WebSocket | null>(null)
  const connectionError = ref<string>('')
  const connectionDetails = ref<string>('')
  const lastPingTime = ref<string>('')
  const connectionStartTime = ref<number>(0)
  const lastReconnectTime = ref<string>('')
  const sessionId = ref<string>('')
  const connectionLogs = ref<Array<{time: string, message: string, type: 'info' | 'error' | 'success'}>>([])
  const reconnectAttempts = ref<number>(0)
  const maxReconnectAttempts = 5
  const reconnectTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
  const browserInfo = ref<string>('Detecting...')
  const deviceType = ref<string>('Detecting...')
  
  // Helper function for current time
  const getCurrentTime = () => {
    return new Date().toLocaleTimeString()
  }
  
  // Detect browser and device info
  const detectClientInfo = () => {
    // Detect browser
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    let device = 'Desktop';
    
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      device = 'iOS';
    } else if (/android/i.test(userAgent)) {
      device = 'Android';
    } else if (/Windows Phone/i.test(userAgent)) {
      device = 'Windows Phone';
    } else if (/Tablet|iPad/i.test(userAgent)) {
      device = 'Tablet';
    } else if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile/i.test(userAgent)) {
      device = 'Mobile';
    }
    
    if (userAgent.indexOf('Firefox') > -1) {
      browser = 'Firefox';
    } else if (userAgent.indexOf('SamsungBrowser') > -1) {
      browser = 'Samsung Browser';
    } else if (userAgent.indexOf('Opera') > -1 || userAgent.indexOf('OPR') > -1) {
      browser = 'Opera';
    } else if (userAgent.indexOf('Trident') > -1) {
      browser = 'Internet Explorer';
    } else if (userAgent.indexOf('Edge') > -1) {
      browser = 'Edge';
    } else if (userAgent.indexOf('Chrome') > -1) {
      browser = 'Chrome';
    } else if (userAgent.indexOf('Safari') > -1) {
      browser = 'Safari';
    }
    
    browserInfo.value = `${browser} (${userAgent.substring(0, 40)}...)`;
    deviceType.value = device;
    
    logMessage(`Client detected: ${browser} on ${device}`, 'info');
  }
  
  // Log a message to the connection log
  const logMessage = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    connectionLogs.value.unshift({
      time: getCurrentTime(),
      message,
      type
    })
    
    // Limit log size
    if (connectionLogs.value.length > 50) {
      connectionLogs.value.pop()
    }
    
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
  
  // Computed properties
  const connectionStatusText = computed(() => {
    switch (connectionStatus.value) {
      case 'connected':
        return 'Bağlandı'
      case 'connecting':
        return 'Bağlanıyor...'
      case 'disconnected':
        return 'Bağlantı Kesildi'
      default:
        return 'Bilinmeyen Durum'
    }
  })
  
  const connectionStatusClass = computed(() => {
    switch (connectionStatus.value) {
      case 'connected':
        return 'bg-green-500'
      case 'connecting':
        return 'bg-yellow-500'
      case 'disconnected':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  })
  
  const connectionDuration = computed(() => {
    if (!connectionStartTime.value || connectionStatus.value !== 'connected') {
      return '0 saniye'
    }
    
    const seconds = Math.floor((Date.now() - connectionStartTime.value) / 1000)
    
    if (seconds < 60) {
      return `${seconds} saniye`
    }
    
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    
    if (minutes < 60) {
      return `${minutes} dakika ${remainingSeconds} saniye`
    }
    
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    
    return `${hours} saat ${remainingMinutes} dakika ${remainingSeconds} saniye`
  })
  
  // Initialize WebSocket connection
  const initWebSocket = () => {
    try {
      // Generate a random session ID for this connection attempt
      const randomId = Math.random().toString(36).substring(2, 10);
      sessionId.value = randomId;
      logMessage(`Yeni oturum başlatılıyor: ${randomId}`, 'info');
      
      // Close existing connection if any
      if (ws.value && ws.value.readyState !== WebSocket.CLOSED) {
        ws.value.close();
      }
      
      connectionStatus.value = 'connecting';
      logMessage('WebSocket bağlantısı başlatılıyor...', 'info');
  
      // Use the runtime config to get the WebSocket URL
      const wsUrl = useRuntimeConfig().public.wsUrl;
      logMessage(`WebSocket URL: ${wsUrl}`, 'info');
      
      // Gather connection details
      connectionDetails.value = 
        `URL: ${wsUrl}\n` +
        `Browser: ${browserInfo.value}\n` +
        `Device: ${deviceType.value}\n` +
        `Session ID: ${randomId}\n` +
        `User Agent: ${navigator.userAgent}\n` +
        `Time: ${new Date().toString()}`;
      
      ws.value = new WebSocket(wsUrl);
      
      ws.value.onopen = () => {
        connectionStatus.value = 'connected';
        connectionStartTime.value = Date.now();
        connectionError.value = '';
        reconnectAttempts.value = 0;
        logMessage('WebSocket bağlantısı başarıyla kuruldu!', 'success');
      };
      
      ws.value.onclose = (event) => {
        connectionStatus.value = 'disconnected';
        logMessage(`WebSocket bağlantısı kapandı. Kod: ${event.code}, Sebep: ${event.reason || 'Belirtilmedi'}`, 'info');
        
        // Add detailed error message based on close code
        let closeReason = 'Bilinmeyen hata';
        switch (event.code) {
          case 1000:
            closeReason = 'Normal kapanış';
            break;
          case 1001:
            closeReason = 'Endpoint ayrıldı';
            break;
          case 1002:
            closeReason = 'Protokol hatası';
            break;
          case 1003:
            closeReason = 'Geçersiz veri tipi';
            break;
          case 1005:
            closeReason = 'Kod belirtilmemiş';
            break;
          case 1006:
            closeReason = 'Anormal kapanış (bağlantı koptu)';
            break;
          case 1007:
            closeReason = 'Geçersiz çerçeve verileri';
            break;
          case 1008:
            closeReason = 'İlke ihlali';
            break;
          case 1009:
            closeReason = 'Mesaj çok büyük';
            break;
          case 1010:
            closeReason = 'Uzantı eksik';
            break;
          case 1011:
            closeReason = 'Sunucu hatası';
            break;
          case 1015:
            closeReason = 'TLS el sıkışma hatası';
            break;
        }
        logMessage(`Kapanış sebebi: ${closeReason} (${event.code})`, 'error');
        
        // Attempt to reconnect unless we've reached max attempts
        if (reconnectAttempts.value < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.value), 10000);
          logMessage(`${delay/1000} saniye sonra yeniden bağlanılacak (Deneme ${reconnectAttempts.value + 1}/${maxReconnectAttempts})`, 'info');
          
          reconnectTimeout.value = setTimeout(() => {
            lastReconnectTime.value = getCurrentTime();
            reconnectAttempts.value++;
            initWebSocket();
          }, delay);
        } else {
          connectionError.value = 'Maksimum yeniden bağlanma denemesi aşıldı. Lütfen sayfayı yenileyin.';
          logMessage('Maksimum yeniden bağlanma denemesi aşıldı.', 'error');
        }
      };
      
      ws.value.onerror = (error) => {
        connectionError.value = 'WebSocket bağlantısında hata oluştu.';
        logMessage(`WebSocket bağlantısında hata: ${JSON.stringify(error)}`, 'error');
      };
      
      ws.value.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'counter') {
            activeUsers.value = data.count;
            logMessage(`Aktif kullanıcı sayısı güncellendi: ${data.count}`, 'info');
          }
          
          lastPingTime.value = getCurrentTime();
        } catch (e) {
          logMessage(`Mesaj işlenirken hata oluştu: ${e}`, 'error');
        }
      };
    } catch (error) {
      connectionError.value = `Bağlantı başlatılamadı: ${error}`;
      logMessage(`Bağlantı başlatılamadı: ${error}`, 'error');
    }
  };
  
  // Manual reconnect function
  const reconnect = () => {
    logMessage('Manuel yeniden bağlanma başlatıldı', 'info');
    initWebSocket();
  };
  
  // Set up regular heartbeat to update connection duration
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  
  onMounted(() => {
    detectClientInfo();
    logMessage('Sayfa yüklendi, WebSocket bağlantısı başlatılıyor...', 'info');
    initWebSocket();
    
    heartbeatInterval = setInterval(() => {
      if (connectionStatus.value === 'connected') {
        // Update calculated duration
        const duration = connectionDuration.value;
        
        // Send ping every 30 seconds
        if ((Date.now() - connectionStartTime.value) % 30000 < 1000) {
          if (ws.value && ws.value.readyState === WebSocket.OPEN) {
            ws.value.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
            logMessage('Ping gönderildi', 'info');
          }
        }
      }
    }, 1000);
  });
  
  onUnmounted(() => {
    if (ws.value) {
      logMessage('Sayfa kapatılıyor, bağlantı sonlandırılıyor', 'info');
      ws.value.close();
    }
    
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    
    if (reconnectTimeout.value) {
      clearTimeout(reconnectTimeout.value);
    }
  });
  </script>