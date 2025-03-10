import { BrowserRouter, Routes, Route } from "react-router"
import "./App.css";
import Auth from "@app/Auth";
import { useEffect } from "react";
import { initializeSuperUser } from "@/database/user";
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
import DebtorsPage from "./app/debtors";
import PurchaseOrdersPage from "./app/orders";
import Expenses from "./app/expenses";
import TeamMembersPage from "./app/teams";

function App() {
  useEffect(() => {
    initializeSuperUser()
  }, [])
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
                    <Route path='stocks'>
                        <Route path='' element={<Stocks />} />
                        <Route path='create' element={<CreateStock />} />
                    </Route>
                    <Route path='suppliers'>
                        <Route path='' element={<Supplliers />} />
                    </Route>
                    <Route path='debtors'>
                        <Route path='' element={<DebtorsPage />} />
                    </Route>
                    <Route path='orders'>
                        <Route path='' element={<PurchaseOrdersPage />} />
                        {/* <Route path='create' element={<CreateSale />} /> */}
                    </Route>
                    <Route path='expenses'>
                        <Route path='' element={<Expenses />} />
                        {/* <Route path='create' element={<CreateSale />} /> */}
                    </Route>
                    <Route path='teams'>
                        <Route path='' element={<TeamMembersPage />} />
                        {/* <Route path='create' element={<CreateSale />} /> */}
                    </Route>
                    <Route path='settings'>
                        <Route path='' element={<Expenses />} />
                        {/* <Route path='create' element={<CreateSale />} /> */}
                    </Route>
                </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
