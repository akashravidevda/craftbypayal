// Craft by Payal — site settings.
window.CBP_CONFIG = {
  // Web-app address of the Google Sheet order book (see backend/google-sheets/SETUP.md).
  // Looks like: https://script.google.com/macros/s/XXXXXXXX/exec
  // This is the isolated staging backend. New orders stay closed outside testing.
  // Schema 2 checkout requires a working backend; WhatsApp is a follow-up step.
  CATALOG_SCHEMA: 2,
  RESIN_ART_SAMPLES: true, // Local preview only; stock photos are never orderable.
  OWNER_SHEET_URL: 'https://docs.google.com/spreadsheets/d/1McFjdhYeIX122j04rAYR6_HXYyGt4vcAVtWVJosTEFY/edit',
  ORDER_API: 'https://script.google.com/macros/s/AKfycbxCQyaTV7hSbm_nTLmz_BTP3uGb8CarDLF6N9jLYldafd2hcDkkcimzmlQ1-PSZ_A_VQw/exec'

};
