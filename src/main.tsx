import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from "react-oidc-context";

console.log(import.meta.env);

createRoot(document.getElementById("root")!).render(
    <AuthProvider 
        authority={import.meta.env.VITE_OIDC_ISSUER}
        client_id={import.meta.env.VITE_OIDC_CLIENT_ID}
        redirect_uri={window.location.origin}
        scope={import.meta.env.VITE_OIDC_SCOPES || "openid profile email"}
        automaticSilentRenew={true}
    >
        <App />
    </AuthProvider>
);
