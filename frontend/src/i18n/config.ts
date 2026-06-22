import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const languageConfig = {
  locales: ['en', 'ur', 'ar'],
  defaultLocale: 'en',
  languages: {
    en: { name: 'English', dir: 'ltr' },
    ur: { name: 'اردو', dir: 'rtl' },
    ar: { name: 'العربية', dir: 'rtl' }
  }
};

const resources = {
  en: {
    common: {
      "app_title": "Omnidesk OS",
      "search_placeholder": "Search documents, tables, or canvases...",
      "add_block": "+ Add Block",
      "add_metric": "+ Add Metric Card",
      "add_grid": "+ Add Smart Grid",
      "drag_to_move": "⣿ Drag to move",
      "settings": "Settings",
      "total_outstanding": "Total Outstanding Due",
      "total_recovery": "Total Recovery",
      "paid": "Paid",
      "pending": "Pending",
      "overdue": "Overdue",
      "invoice_id": "Invoice ID",
      "customer_name": "Customer Name",
      "date": "Date",
      "status": "Status",
      "actions": "Actions",
      "new_page": "+ New Page",
      "workspace_title": "Wholesale Performance Dashboard",
      "sales_guidelines": "Sales Policy Guidelines",
      "daily_sales_table": "Daily Sales & Recovery",
      "word_count": "Word Count",
      "saved_status": "Saved to Cloud",
      "active_users": "Active Users",
      "formula_modal_title": "Configure Block Connection",
      "source_table": "Source Data Table",
      "source_column": "Source Calculation Column",
      "operation": "Operation Function",
      "save_config": "Save Configuration",
      "cancel": "Cancel"
    }
  },
  ur: {
    common: {
      "app_title": "اومنی ڈیسک OS",
      "search_placeholder": "دستاویزات، ٹیبلز، یا کینوس تلاش کریں...",
      "add_block": "+ بلاک شامل کریں",
      "add_metric": "+ میٹرک کارڈ جوڑیں",
      "add_grid": "+ اسمارٹ گرڈ جوڑیں",
      "drag_to_move": "⣿ ڈریگ کر کے منتقل کریں",
      "settings": "ترتیبات",
      "total_outstanding": "کل بقایا جات",
      "total_recovery": "کل ڈیلی ریکوری",
      "paid": "ادا شدہ",
      "pending": "زیر التواء",
      "overdue": "تاخیر شدہ",
      "invoice_id": "انوائس نمبر",
      "customer_name": "گاہک کا نام",
      "date": "تاریخ",
      "status": "حالت",
      "actions": "اقدامات",
      "new_page": "+ نیا صفحہ",
      "workspace_title": "ہول سیل کارکردگی کا ڈیش بورڈ",
      "sales_guidelines": "سیلز پالیسی گائیڈ لائنز",
      "daily_sales_table": "روزانہ کی فروخت اور ریکوری",
      "word_count": "الفاظ کی تعداد",
      "saved_status": "کلاؤڈ پر محفوظ ہے",
      "active_users": "فعال صارفین",
      "formula_modal_title": "بلاک کنکشن ترتیب دیں",
      "source_table": "ڈیٹا سورس ٹیبل",
      "source_column": "حساب کا کالم",
      "operation": "فارمولا فنکشن",
      "save_config": "ترتیب محفوظ کریں",
      "cancel": "منسوخ کریں"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
