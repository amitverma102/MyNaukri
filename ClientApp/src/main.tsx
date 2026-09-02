import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'

import { ThemeProvider, createTheme } from '@mui/material/styles';

const queryClient = new QueryClient();

const theme = createTheme({
  palette: {
    primary: {
      main: '#53c5ab', // Teal color from EduKey360 logo
      contrastText: '#fff',
    },
    // We can leave secondary as default or set it to dark gray
    secondary: {
      main: '#4A4A4A', 
    }
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
