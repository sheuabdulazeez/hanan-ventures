import { BrowserRouter, Routes, Route } from "react-router"
import "./App.css";
import Auth from "@app/Auth";
import RootLayout from "@components/RootLayout";
import Layout from "@components/Layout";
import DashboardPage from "./app/dashboard";
import Customers from "./app/customers";
import AddCustomerPage from "./app/customers/Create";
import SalesPage from "./app/sales";
import CreateSales from "./app/sales/Create";
import Stocks from "./app/stocks";
import CreateStock from "./app/stocks/Create";
import Supplliers from "./app/suppliers";
import CreateSupplier from "./app/suppliers/create";
import DebtorsPage from "./app/debtors";
import ProfitPage from "./app/profit";
import PurchaseOrdersPage from "./app/orders";
import Expenses from "./app/expenses";
import AddExpensePage from "./app/expenses/Create";
import SettingsPage from "./app/settings";
import TeamMembersPage from "./app/teams";
import ProductAnalysis from "./app/product-analysis/ProductAnalysis";
import CashierSummaryPage from "./app/cashier-summary";
import RoleGuard from "@components/RoleGuard";
import { UserRole } from "@/types/database";

const ADMIN_ROLES = [UserRole.super_admin, UserRole.admin, UserRole.manager];

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<RootLayout />}>
                    <Route index element={<Auth />} />
                    <Route path='dashboard' element={<Layout />}>
                        <Route path='' element={<DashboardPage />} />
                        <Route path='customers'>
                            <Route path='' element={<Customers />} />
                            <Route path='create' element={<AddCustomerPage />} />
                        </Route>
                        <Route path='sales'>
                            <Route path='' element={<SalesPage />} />
                            <Route path='create' element={<CreateSales />} />
                        </Route>
                        <Route path='cashier-summary'>
                            <Route path='' element={<CashierSummaryPage />} />
                        </Route>
                        <Route path='stocks'>
                            <Route path='' element={<Stocks />} />
                            <Route path='create' element={<CreateStock />} />
                        </Route>
                        <Route path='product-analysis'>
                            <Route path=':id' element={<ProductAnalysis />} />
                        </Route>
                        <Route path='suppliers'>
                            <Route path='' element={<RoleGuard allow={ADMIN_ROLES}><Supplliers /></RoleGuard>} />
                            <Route path='create' element={<RoleGuard allow={ADMIN_ROLES}><CreateSupplier /></RoleGuard>} />
                        </Route>
                        <Route path='debtors'>
                            <Route path='' element={<DebtorsPage />} />
                        </Route>
                        <Route path='profit'>
                            <Route path='' element={<RoleGuard allow={ADMIN_ROLES}><ProfitPage /></RoleGuard>} />
                        </Route>
                        <Route path='orders'>
                            <Route path='' element={<PurchaseOrdersPage />} />
                            {/* <Route path='create' element={<CreateSale />} /> */}
                        </Route>
                        <Route path='expenses'>
                            <Route path='' element={<RoleGuard allow={ADMIN_ROLES}><Expenses /></RoleGuard>} />
                            <Route path='create' element={<RoleGuard allow={ADMIN_ROLES}><AddExpensePage /></RoleGuard>} />
                        </Route>
                        <Route path='teams'>
                            <Route path='' element={<RoleGuard allow={ADMIN_ROLES}><TeamMembersPage /></RoleGuard>} />
                            {/* <Route path='create' element={<CreateSale />} /> */}
                        </Route>
                        <Route path='settings'>
                            <Route path='' element={<RoleGuard allow={[UserRole.super_admin]}><SettingsPage /></RoleGuard>} />
                        </Route>
                    </Route>
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
