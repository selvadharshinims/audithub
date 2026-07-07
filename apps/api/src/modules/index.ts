import { Router } from "express";
import { adminRouter } from "./admin/routes.js";
import { authRouter } from "./auth/routes.js";
import { clientsRouter } from "./clients/routes.js";
import { clientCompaniesRouter, companiesRouter } from "./companies/routes.js";
import { dashboardRouter } from "./dashboard/routes.js";
import { clientDocumentsRouter, documentsRouter } from "./documents/routes.js";
import { expensesRouter } from "./expenses/routes.js";
import { invoicesRouter, invoicePublicRouter } from "./invoices/routes.js";
import { paymentsRouter } from "./payments/routes.js";
import { tasksRouter } from "./tasks/routes.js";
import { remindersRouter } from "./reminders/routes.js";
import { reportsRouter } from "./reports/routes.js";
import { servicesRouter } from "./services/routes.js";
import { notificationsRouter } from "./notifications/routes.js";
import { settingsRouter } from "./settings/routes.js";
import { usersRouter } from "./users/routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/clients", clientsRouter);
apiRouter.use("/clients", clientDocumentsRouter); // /clients/:id/documents
apiRouter.use("/clients", clientCompaniesRouter); // /clients/:id/companies
apiRouter.use("/documents", documentsRouter); // /documents/:id/(download|delete)
apiRouter.use("/companies", companiesRouter); // /companies/:id (update, delete)
apiRouter.use("/invoices/public", invoicePublicRouter); // unauthenticated shared PDF links — must precede /invoices
apiRouter.use("/invoices", invoicesRouter);
apiRouter.use("/payments", paymentsRouter);
apiRouter.use("/expenses", expensesRouter);
apiRouter.use("/tasks", tasksRouter);
apiRouter.use("/reminders", remindersRouter);
apiRouter.use("/reports", reportsRouter);
apiRouter.use("/services", servicesRouter);
apiRouter.use("/notifications", notificationsRouter);
apiRouter.use("/settings", settingsRouter);
apiRouter.use("/users", usersRouter);
