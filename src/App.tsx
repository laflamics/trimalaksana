import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import BusinessSelector from './pages/BusinessSelector';
import ProtectedRoute from './components/ProtectedRoute';
import PackagingLayout from './pages/Packaging/Layout';
import GeneralTradingLayout from './pages/GeneralTrading/Layout';
import TruckingLayout from './pages/Trucking/Layout';
import Login from './pages/Auth/Login';
import GeneralTradingDashboard from './pages/GeneralTrading/Dashboard';
import TruckingDashboard from './pages/Trucking/Dashboard';

// General Trading - Master
import GTProducts from './pages/GeneralTrading/Master/Products';
import GTCustomers from './pages/GeneralTrading/Master/Customers';
import GTSuppliers from './pages/GeneralTrading/Master/Suppliers';
import GTInventory from './pages/GeneralTrading/Master/Inventory';

// General Trading - Orders & Sales
import GTSalesOrders from './pages/GeneralTrading/SalesOrders';
// import GTPurchaseOrders from './pages/GeneralTrading/Orders/PurchaseOrders';
// import GTQuotations from './pages/GeneralTrading/Sales/Quotations';
// import GTInvoices from './pages/GeneralTrading/Sales/Invoices';
// import GTStockManagement from './pages/GeneralTrading/Warehouse/StockManagement';
// import GTReceiving from './pages/GeneralTrading/Warehouse/Receiving';
// import GTShipping from './pages/GeneralTrading/Warehouse/Shipping';
// import GTPurchaseRequisition from './pages/GeneralTrading/Purchasing/PurchaseRequisition';

// General Trading - Purchasing
import GTPurchasing from './pages/GeneralTrading/Purchasing';
import GTDeliveryNote from './pages/GeneralTrading/DeliveryNote';
import GTPPIC from './pages/GeneralTrading/PPIC';
import GTWorkflow from './pages/GeneralTrading/Workflow';
import GTReturn from './pages/GeneralTrading/Return';

// General Trading - Finance
import GTGeneralLedger from './pages/GeneralTrading/Finance/GeneralLedger';
import GTFinancialReports from './pages/GeneralTrading/Finance/FinancialReports';
import GTAccounting from './pages/GeneralTrading/Finance/Accounting';
import GTAccountsReceivable from './pages/GeneralTrading/Finance/AccountsReceivable';
import GTAccountsPayable from './pages/GeneralTrading/Finance/AccountsPayable';
import GTPayments from './pages/GeneralTrading/Finance/Payments';
import GTTaxManagement from './pages/GeneralTrading/Finance/TaxManagement';
import GTCostAnalysis from './pages/GeneralTrading/Finance/CostAnalysis';
import GTCoa from './pages/GeneralTrading/Finance/COA';
import GTInvoices from './pages/GeneralTrading/Finance/invoices';
// Note: COA belum dibuat
// import GTCOA from './pages/GeneralTrading/Finance/COA';

// General Trading - Settings
import GTSettings from './pages/GeneralTrading/Settings/Settings';
import GTReport from './pages/GeneralTrading/Settings/Report';

// Packaging - Enhanced System
import GTDBActivity from './pages/GeneralTrading/Settings/DBActivity';
import GTUserControl from './pages/GeneralTrading/Settings/UserControl';
import GTFlowTest from './pages/GeneralTrading/GTFlowTest';
import CompleteFlowTest from './pages/Testing/CompleteFlowTest';

// Master
import Products from './pages/Master/Products';
import Materials from './pages/Master/Materials';
import Customers from './pages/Master/Customers';
import Suppliers from './pages/Master/Suppliers';
import Inventory from './pages/Master/Inventory';

// Packaging
import Workflow from './pages/Packaging/Workflow';
import SalesOrders from './pages/Packaging/SalesOrders';
import PPIC from './pages/Packaging/PPIC';
import Purchasing from './pages/Packaging/Purchasing';
import Production from './pages/Packaging/Production';
import QAQC from './pages/Packaging/QAQC';
import DeliveryNote from './pages/Packaging/DeliveryNote';
import PackagingReturn from './pages/Packaging/Return';

// Finance (Packaging)
import Finance from './pages/Finance/Finance';
import PackagingGeneralLedger from './pages/Packaging/Finance/GeneralLedger';
import PackagingFinancialReports from './pages/Packaging/Finance/FinancialReports';
import PackagingAccounting from './pages/Packaging/Finance/Accounting'; // Journal Entries only
import PackagingInvoices from './pages/Finance/Accounting'; // Invoice Management with notifications (use old Accounting)
import PackagingAccountsReceivable from './pages/Packaging/Finance/AccountsReceivable';
import PackagingAccountsPayable from './pages/Packaging/Finance/AccountsPayable';
import PackagingPayments from './pages/Packaging/Finance/Payments';
import PackagingCostAnalysis from './pages/Packaging/Finance/CostAnalysis';
import PackagingTaxManagement from './pages/Packaging/Finance/TaxManagement';
import AllBusinessFinancialReports from './pages/Finance/AllBusinessFinancialReports';
import COA from './pages/Finance/COA';

// HR
import HRD from './pages/HR/HRD';

// Settings
import Settings from './pages/Settings/Settings';
import Report from './pages/Settings/Report';
import DBActivity from './pages/Settings/DBActivity';
import TestAutomation from './pages/Settings/TestAutomation';
import UserControl from './pages/Settings/UserControl';

// Trucking - Master
import TruckingVehicles from './pages/Trucking/Master/Vehicles';
import TruckingDrivers from './pages/Trucking/Master/Drivers';
import TruckingRoutes from './pages/Trucking/Master/Routes';
import TruckingCustomers from './pages/Trucking/Master/Customers';

// Trucking - Shipments
import TruckingDeliveryOrders from './pages/Trucking/Shipments/DeliveryOrders';
import TruckingSuratJalan from './pages/Trucking/Shipments/SuratJalan';

// Trucking - Finance
import TruckingGeneralLedger from './pages/Trucking/Finance/GeneralLedger';
import TruckingFinancialReports from './pages/Trucking/Finance/FinancialReports';
import TruckingAccounting from './pages/Trucking/Finance/Accounting';
import TruckingInvoices from './pages/Trucking/Finance/invoices';
import TruckingAccountsReceivable from './pages/Trucking/Finance/AccountsReceivable';
import TruckingAccountsPayable from './pages/Trucking/Finance/AccountsPayable';
import TruckingPayments from './pages/Trucking/Finance/Payments';
import TruckingTaxManagement from './pages/Trucking/Finance/TaxManagement';
import TruckingCostAnalysis from './pages/Trucking/Finance/CostAnalysis';
import TruckingCOA from './pages/Trucking/Finance/COA';
import TruckingPettyCash from './pages/Trucking/Finance/PettyCash';

// Trucking - Settings
// Trucking - Settings
import TruckingSettings from './pages/Trucking/Settings/Settings';
import TruckingDBActivity from './pages/Trucking/Settings/DBActivity';
import TruckingUserControl from './pages/GeneralTrading/Settings/UserControl'; // Reuse from GT
// Trucking - Unit Scheduling
import TruckingUnitScheduling from './pages/Trucking/UnitScheduling';

function App() {
  console.log('📱 App component rendering...');
  
  return (
    <HashRouter>
      <Routes>
        {/* Login */}
        <Route path="/login" element={<Login />} />

        {/* Business Selector - Landing Page */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <BusinessSelector />
            </ProtectedRoute>
          }
        />

        {/* Packaging Routes */}
        <Route
          path="/packaging/*"
          element={
            <ProtectedRoute requiredBusiness="packaging">
              <PackagingLayout>
                <Routes>                  
                  {/* Master */}
                  <Route path="master/products" element={<Products />} />
                  <Route path="master/materials" element={<Materials />} />
                  <Route path="master/customers" element={<Customers />} />
                  <Route path="master/suppliers" element={<Suppliers />} />
                  <Route path="master/inventory" element={<Inventory />} />

                  {/* Packaging */}
                  <Route path="workflow" element={<Workflow />} />
                  <Route path="sales-orders" element={<SalesOrders />} />
                  <Route path="ppic" element={<PPIC />} />
                  <Route path="purchasing" element={<Purchasing />} />
                  <Route path="production" element={<Production />} />
                  <Route path="qa-qc" element={<QAQC />} />
                  <Route path="delivery-note" element={<DeliveryNote />} />
                  <Route path="return" element={<PackagingReturn />} />

                  {/* Finance */}
                  <Route path="finance" element={<Finance />} />
                  <Route path="finance/ledger" element={<PackagingGeneralLedger />} />
                  <Route path="finance/reports" element={<PackagingFinancialReports />} />
                  <Route path="finance/invoices" element={<PackagingInvoices />} />
                  <Route path="finance/accounting" element={<PackagingAccounting />} />
                  <Route path="finance/ar" element={<PackagingAccountsReceivable />} />
                  <Route path="finance/ap" element={<PackagingAccountsPayable />} />
                  <Route path="finance/payments" element={<PackagingPayments />} />
                  <Route path="finance/tax-management" element={<PackagingTaxManagement />} />
                  <Route path="finance/cost-analysis" element={<PackagingCostAnalysis />} />
                  <Route path="finance/all-business-reports" element={<AllBusinessFinancialReports />} />
                  <Route path="finance/coa" element={<COA />} />

                  {/* HR */}
                  <Route path="hr" element={<HRD />} />

                  {/* Settings */}
                  <Route path="settings" element={<Settings />} />
                  <Route path="settings/report" element={<Report />} />
                  <Route path="settings/db-activity" element={<DBActivity />} />
                  <Route path="settings/user-control" element={<UserControl />} />
                  <Route path="settings/test-automation" element={<TestAutomation />} />

                  {/* Default redirect untuk packaging - ke financial reports */}
                  <Route path="" element={<Navigate to="finance/reports" replace />} />
                  <Route path="*" element={<Navigate to="finance/reports" replace />} />
                </Routes>
              </PackagingLayout>
            </ProtectedRoute>
          }
        />

        {/* General Trading Routes */}
        <Route
          path="/general-trading/*"
          element={
            <ProtectedRoute requiredBusiness="general-trading">
              <GeneralTradingLayout>
                <Routes>
                  <Route path="dashboard" element={<GeneralTradingDashboard />} />
                  
                  {/* Master */}
                  <Route path="master/products" element={<GTProducts />} />
                  <Route path="master/customers" element={<GTCustomers />} />
                  <Route path="master/suppliers" element={<GTSuppliers />} />
                  <Route path="master/inventory" element={<GTInventory />} />

                  {/* Orders */}
                  <Route path="orders/sales" element={<GTSalesOrders />} />

                  {/* Sales */}

                  {/* Purchasing */}
                  <Route path="purchasing" element={<GTPurchasing />} />
                  <Route path="delivery-note" element={<GTDeliveryNote />} />
                  <Route path="ppic" element={<GTPPIC />} />
                  <Route path="return" element={<GTReturn />} />

                  {/* Warehouse */}
                  <Route path="workflow" element={<GTWorkflow />} />

                  {/* Finance */}
                  <Route path="finance/ledger" element={<GTGeneralLedger />} />
                  <Route path="finance/reports" element={<GTFinancialReports />} />
                  <Route path="finance/accounting" element={<GTAccounting />} />
                  <Route path="finance/ar" element={<GTAccountsReceivable />} />
                  <Route path="finance/ap" element={<GTAccountsPayable />} />
                  <Route path="finance/payments" element={<GTPayments />} />
                  <Route path="finance/tax-management" element={<GTTaxManagement />} />
                  <Route path="finance/cost-analysis" element={<GTCostAnalysis />} />
                  <Route path="finance/coa" element={<GTCoa />} />
                  <Route path="finance/invoices" element={<GTInvoices />} />

                  {/* Settings */}
                  <Route path="settings" element={<GTSettings />} />
                  <Route path="settings/report" element={<GTReport />} />
                  <Route path="settings/db-activity" element={<GTDBActivity />} />
                  <Route path="settings/user-control" element={<GTUserControl />} />
                  <Route path="settings/flow-test" element={<GTFlowTest />} />
                  <Route path="settings/complete-flow-test" element={<CompleteFlowTest />} />

                  {/* Default redirect untuk general trading - ke financial reports */}
                  <Route path="" element={<Navigate to="finance/reports" replace />} />
                  <Route path="*" element={<Navigate to="finance/reports" replace />} />
                </Routes>
              </GeneralTradingLayout>
            </ProtectedRoute>
          }
        />

        {/* Trucking Routes */}
        <Route
          path="/trucking/*"
          element={
            <ProtectedRoute requiredBusiness="trucking">
              <TruckingLayout>
                <Routes>
                  <Route path="dashboard" element={<TruckingDashboard />} />
                  
                  {/* Master */}
                  <Route path="master/vehicles" element={<TruckingVehicles />} />
                  <Route path="master/drivers" element={<TruckingDrivers />} />
                  <Route path="master/routes" element={<TruckingRoutes />} />
                  <Route path="master/customers" element={<TruckingCustomers />} />

                  {/* Shipments */}
                  <Route path="shipments/delivery-orders" element={<TruckingDeliveryOrders />} />
                  <Route path="shipments/surat-jalan" element={<TruckingSuratJalan />} />
                  
                  {/* Unit Scheduling */}
                  <Route path="unit-scheduling" element={<TruckingUnitScheduling />} />

                  {/* Finance */}
                  <Route path="finance/ledger" element={<TruckingGeneralLedger />} />
                  <Route path="finance/reports" element={<TruckingFinancialReports />} />
                  <Route path="finance/accounting" element={<TruckingAccounting />} />
                  <Route path="finance/invoices" element={<TruckingInvoices />} />
                  <Route path="finance/ar" element={<TruckingAccountsReceivable />} />
                  <Route path="finance/ap" element={<TruckingAccountsPayable />} />
                  <Route path="finance/payments" element={<TruckingPayments />} />
                  <Route path="finance/tax-management" element={<TruckingTaxManagement />} />
                  <Route path="finance/cost-analysis" element={<TruckingCostAnalysis />} />
                  <Route path="finance/coa" element={<TruckingCOA />} />
                  <Route path="finance/pettycash" element={<TruckingPettyCash />} />

                  {/* Settings */}
                  <Route path="settings" element={<TruckingSettings />} />
                  <Route path="settings/db-activity" element={<TruckingDBActivity />} />
                  <Route path="settings/user-control" element={<TruckingUserControl />} />

                  {/* Default redirect untuk trucking */}
                  <Route path="" element={<Navigate to="dashboard" replace />} />
                  <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </TruckingLayout>
            </ProtectedRoute>
          }
        />

        {/* Redirect route lama ke business selector - semua harus lewat business selector */}
        <Route path="/master/*" element={<Navigate to="/" replace />} />
        <Route path="/finance/*" element={<Navigate to="/" replace />} />
        <Route path="/hr" element={<Navigate to="/" replace />} />
        <Route path="/settings/*" element={<Navigate to="/" replace />} />

        {/* Fallback - redirect ke business selector */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;

