import React from 'react';import{createRoot}from'react-dom/client';import{StoreProvider}from'../context/StoreContext';import{CustomerApp}from'./CustomerApp';import'../index.css';import'./app.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><StoreProvider><CustomerApp/></StoreProvider></React.StrictMode>);
