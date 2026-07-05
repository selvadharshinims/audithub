import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

// This seed DELETES the demo org's data before re-creating it. Refuse to run
// against a production database unless explicitly forced (SEED_FORCE=1) — one
// stray `pnpm db:seed` against a live DATABASE_URL would destroy client data.
if (process.env.NODE_ENV === "production" && process.env.SEED_FORCE !== "1") {
  console.error("Refusing to seed in production (this deletes data). Set SEED_FORCE=1 to override.");
  process.exit(1);
}

const prisma = new PrismaClient();

const ORG_ID = "00000000-0000-0000-0000-000000000001";

// ─────────────────────────────────────────────────────────────
// Date helpers (today ≈ 2026-07-04, FY 2026-27 = Apr'26 → Mar'27)
// ─────────────────────────────────────────────────────────────
const NOW = new Date();
function daysFromNow(n: number): Date {
  return new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);
}
/** First-ish day of a month `back` months before the current month. */
function monthsAgo(back: number, day = 12): Date {
  const d = new Date(NOW.getFullYear(), NOW.getMonth() - back, day, 10, 0, 0);
  return d;
}
function dec(n: number): Prisma.Decimal {
  return new Prisma.Decimal(n.toFixed(2));
}

async function main() {
  // ── Org + roles + admin (idempotent upsert, unchanged) ──────
  const org = await prisma.organization.upsert({
    where: { id: ORG_ID },
    update: {},
    create: {
      id: ORG_ID,
      name: "Demo CA Firm",
      gstin: "33ABCDE1234F1Z5",
      financialYear: "2026-27",
      plan: "pro",
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: "super_admin" },
    update: {},
    create: { name: "super_admin", permissions: { "*": true } },
  });
  await prisma.role.upsert({
    where: { name: "auditor" },
    update: {},
    create: { name: "auditor", permissions: {} },
  });
  await prisma.role.upsert({
    where: { name: "accountant" },
    update: {},
    create: { name: "accountant", permissions: {} },
  });
  const staffRole = await prisma.role.upsert({
    where: { name: "staff" },
    update: {},
    create: { name: "staff", permissions: {} },
  });

  const passwordHash = await bcrypt.hash("admin@1234", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@audithub.local" },
    update: {},
    create: {
      orgId: org.id,
      roleId: adminRole.id,
      name: "Admin",
      email: "admin@audithub.local",
      passwordHash,
    },
  });

  // A staff member so clients/tasks have an assignee variety.
  const staffHash = await bcrypt.hash("staff@1234", 12);
  const staff = await prisma.user.upsert({
    where: { email: "priya@audithub.local" },
    update: { orgId: org.id, roleId: staffRole.id, name: "Priya Nair" },
    create: {
      orgId: org.id,
      roleId: staffRole.id,
      name: "Priya Nair",
      email: "priya@audithub.local",
      passwordHash: staffHash,
    },
  });
  const staffIds = [admin.id, staff.id];

  // ── Idempotency: wipe prior demo data for this org ──────────
  const orgClientIds = (
    await prisma.client.findMany({ where: { orgId: org.id }, select: { id: true } })
  ).map((c) => c.id);

  // Tasks first (Task.clientId is SetNull → would orphan otherwise).
  await prisma.task.deleteMany({
    where: {
      OR: [
        { clientId: { in: orgClientIds } },
        { assigneeId: { in: staffIds } },
      ],
    },
  });
  await prisma.notification.deleteMany({ where: { userId: { in: staffIds } } });
  await prisma.activityLog.deleteMany({ where: { orgId: org.id } });
  await prisma.expense.deleteMany({ where: { orgId: org.id } });
  await prisma.service.deleteMany({ where: { orgId: org.id } });
  // Clients cascade → companies, documents, invoices→payments, reminders→dispatches.
  await prisma.client.deleteMany({ where: { orgId: org.id } });

  // ── Services catalog ────────────────────────────────────────
  const services = await Promise.all(
    [
      { name: "GST Return Filing (GSTR-3B)", defaultFee: 3500, sacCode: "998231" },
      { name: "Income Tax Return - Individual", defaultFee: 5000, sacCode: "998232" },
      { name: "Statutory Audit", defaultFee: 75000, sacCode: "998221" },
      { name: "TDS Return Filing", defaultFee: 4000, sacCode: "998231" },
      { name: "ROC Annual Filing", defaultFee: 12000, sacCode: "998311" },
      { name: "Company Incorporation", defaultFee: 25000, sacCode: "998311" },
    ].map((s) =>
      prisma.service.create({
        data: { orgId: org.id, name: s.name, defaultFee: dec(s.defaultFee), sacCode: s.sacCode },
      }),
    ),
  );

  // ── Clients (~12) ───────────────────────────────────────────
  type ClientSeed = {
    name: string;
    pan: string;
    gstin?: string;
    mobile: string;
    email: string;
    address: string;
    status: "active" | "pending" | "inactive";
    assignee: string;
    company?: { legalName: string; businessType: string; regNo: string };
    docs: { type: string; name: string }[];
  };

  const clientSeeds: ClientSeed[] = [
    {
      name: "Ramesh Iyer",
      pan: "ABCPI1234E",
      mobile: "9840012345",
      email: "ramesh.iyer@gmail.com",
      address: "12, Gandhi Street, T. Nagar, Chennai 600017",
      status: "active",
      assignee: admin.id,
      docs: [{ type: "PAN", name: "PAN Card.pdf" }, { type: "Aadhaar", name: "Aadhaar.pdf" }],
    },
    {
      name: "Sunrise Textiles Pvt Ltd",
      pan: "AACCS5678F",
      gstin: "33AACCS5678F1Z2",
      mobile: "9820011223",
      email: "accounts@sunrisetextiles.in",
      address: "Plot 45, SIDCO Industrial Estate, Coimbatore 641021",
      status: "active",
      assignee: staff.id,
      company: { legalName: "Sunrise Textiles Private Limited", businessType: "Private Limited", regNo: "U17111TZ2015PTC021345" },
      docs: [{ type: "GST Certificate", name: "GST Registration.pdf" }, { type: "Incorporation", name: "Certificate of Incorporation.pdf" }],
    },
    {
      name: "Lakshmi Traders",
      pan: "AAKFL9012G",
      gstin: "33AAKFL9012G1Z8",
      mobile: "9791122334",
      email: "lakshmi.traders@yahoo.com",
      address: "88, Bazaar Road, Madurai 625001",
      status: "active",
      assignee: admin.id,
      company: { legalName: "Lakshmi Traders", businessType: "Partnership", regNo: "TN/PART/2018/4521" },
      docs: [{ type: "Partnership Deed", name: "Partnership Deed.pdf" }],
    },
    {
      name: "Anitha Krishnan",
      pan: "BXYPK3456H",
      mobile: "9944556677",
      email: "anitha.k@outlook.com",
      address: "5B, Lake View Apartments, Anna Nagar, Chennai 600040",
      status: "active",
      assignee: staff.id,
      docs: [{ type: "Form 16", name: "Form 16 FY25-26.pdf" }],
    },
    {
      name: "Green Valley Foods LLP",
      pan: "AABFG7890J",
      gstin: "33AABFG7890J1Z4",
      mobile: "9865544332",
      email: "finance@greenvalleyfoods.co.in",
      address: "23, GST Road, Tambaram, Chennai 600045",
      status: "active",
      assignee: admin.id,
      company: { legalName: "Green Valley Foods LLP", businessType: "LLP", regNo: "AAF-1234" },
      docs: [{ type: "GST Certificate", name: "GST Cert.pdf" }, { type: "Bank Statement", name: "Bank Statement Q1.pdf" }],
    },
    {
      name: "Mohammed Farook",
      pan: "CDEPF6789K",
      mobile: "9600011122",
      email: "farook.m@gmail.com",
      address: "17, Mount Road, Triplicane, Chennai 600005",
      status: "pending",
      assignee: staff.id,
      docs: [{ type: "PAN", name: "PAN.pdf" }],
    },
    {
      name: "Bright Steel Industries",
      pan: "AADCB2345L",
      gstin: "29AADCB2345L1Z9",
      mobile: "9448822110",
      email: "cfo@brightsteel.in",
      address: "Industrial Area, Peenya, Bengaluru 560058",
      status: "active",
      assignee: admin.id,
      company: { legalName: "Bright Steel Industries Ltd", businessType: "Public Limited", regNo: "L27100KA2009PLC050123" },
      docs: [{ type: "Audit Report", name: "Audit Report FY24-25.pdf" }],
    },
    {
      name: "Deepa Sundaram",
      pan: "DEFPD8901M",
      mobile: "9789900112",
      email: "deepa.sundaram@gmail.com",
      address: "9, Besant Nagar 2nd Cross, Chennai 600090",
      status: "active",
      assignee: staff.id,
      docs: [{ type: "Capital Gains", name: "Property Sale Deed.pdf" }],
    },
    {
      name: "Vetri Constructions",
      pan: "AAGFV4567N",
      gstin: "33AAGFV4567N1Z1",
      mobile: "9500033445",
      email: "vetri.constructions@rediffmail.com",
      address: "34, Kamarajar Salai, Trichy 620001",
      status: "active",
      assignee: admin.id,
      company: { legalName: "Vetri Constructions", businessType: "Proprietorship", regNo: "TN/PROP/2016/9987" },
      docs: [{ type: "GST Returns", name: "GSTR-3B Apr-Jun.pdf" }],
    },
    {
      name: "Karthik Rajan",
      pan: "EFGPR2345P",
      mobile: "9840099887",
      email: "karthik.rajan@gmail.com",
      address: "21, Velachery Main Road, Chennai 600042",
      status: "inactive",
      assignee: staff.id,
      docs: [{ type: "PAN", name: "PAN Card.pdf" }],
    },
    {
      name: "Oceanic Exports Pvt Ltd",
      pan: "AACCO6789Q",
      gstin: "33AACCO6789Q1Z6",
      mobile: "9884466778",
      email: "exports@oceanic.co.in",
      address: "Harbour Estate, Tuticorin 628004",
      status: "active",
      assignee: admin.id,
      company: { legalName: "Oceanic Exports Private Limited", businessType: "Private Limited", regNo: "U51909TN2012PTC087654" },
      docs: [{ type: "IEC", name: "Import Export Code.pdf" }, { type: "GST Certificate", name: "GST.pdf" }],
    },
    {
      name: "Suresh Babu",
      pan: "FGHPB6789R",
      mobile: "9791234567",
      email: "suresh.babu@gmail.com",
      address: "3, Nehru Street, Salem 636001",
      status: "inactive",
      assignee: staff.id,
      docs: [{ type: "PAN", name: "PAN.pdf" }],
    },
  ];

  const clients: { id: string; name: string; hasGst: boolean }[] = [];
  for (const c of clientSeeds) {
    const created = await prisma.client.create({
      data: {
        orgId: org.id,
        assignedStaffId: c.assignee,
        name: c.name,
        pan: c.pan,
        gstin: c.gstin ?? null,
        mobile: c.mobile,
        email: c.email,
        address: c.address,
        status: c.status,
        createdAt: monthsAgo(Math.floor(Math.random() * 11) + 1, 5),
        companies: c.company
          ? { create: [{ legalName: c.company.legalName, businessType: c.company.businessType, regNo: c.company.regNo }] }
          : undefined,
        documents: {
          create: c.docs.map((d, i) => ({
            uploadedBy: c.assignee,
            type: d.type,
            name: d.name,
            url: `uploads/demo/${c.pan.toLowerCase()}-${i}.pdf`,
            size: 120000 + i * 45000,
            mimeType: "application/pdf",
          })),
        },
      },
      select: { id: true, name: true, gstin: true },
    });
    clients.push({ id: created.id, name: created.name, hasGst: !!created.gstin });
  }

  // ── Invoices (~18) across all payment statuses & months ─────
  // status must be set manually to match recorded payments.
  type InvSeed = {
    ci: number; // client index
    monthsBack: number;
    subtotal: number;
    status: "paid" | "pending" | "partial" | "overdue";
    interState?: boolean; // IGST vs CGST/SGST
    kind?: "invoice" | "quotation" | "estimate" | "receipt";
    desc: string;
    payFraction?: number; // for partial
  };

  const invSeeds: InvSeed[] = [
    // Paid within current FY (Apr–Jul 2026) → drives revenueFY.
    { ci: 1, monthsBack: 0, subtotal: 75000, status: "paid", desc: "Statutory Audit FY 2025-26" },
    { ci: 4, monthsBack: 0, subtotal: 45000, status: "paid", desc: "GST Advisory Retainer - Jun" },
    { ci: 2, monthsBack: 1, subtotal: 28000, status: "paid", desc: "GST Return Filing Q1 FY26-27" },
    { ci: 10, monthsBack: 1, subtotal: 120000, status: "paid", interState: true, desc: "Export Documentation & Audit" },
    { ci: 6, monthsBack: 2, subtotal: 95000, status: "paid", interState: true, desc: "Statutory Audit + ROC Filing" },
    { ci: 0, monthsBack: 2, subtotal: 15000, status: "paid", desc: "ITR Filing - Individual" },
    { ci: 8, monthsBack: 3, subtotal: 32000, status: "paid", desc: "GST Returns Apr-Jun" },
    // Partial payments.
    { ci: 4, monthsBack: 1, subtotal: 60000, status: "partial", payFraction: 0.5, desc: "Annual Compliance Package" },
    { ci: 2, monthsBack: 3, subtotal: 85000, status: "partial", payFraction: 0.4, desc: "Statutory Audit - Advance" },
    { ci: 10, monthsBack: 4, subtotal: 150000, status: "partial", interState: true, payFraction: 0.6, desc: "Transfer Pricing Study" },
    // Pending (unpaid, due in future).
    { ci: 3, monthsBack: 0, subtotal: 12000, status: "pending", desc: "ITR Filing - Capital Gains" },
    { ci: 7, monthsBack: 0, subtotal: 18000, status: "pending", desc: "ITR + Capital Gains Computation" },
    { ci: 8, monthsBack: 1, subtotal: 40000, status: "pending", desc: "Project Finance Certification" },
    // Overdue (unpaid, due date in the past).
    { ci: 5, monthsBack: 5, subtotal: 22000, status: "overdue", desc: "GST Registration & Setup" },
    { ci: 9, monthsBack: 6, subtotal: 16000, status: "overdue", desc: "ITR Filing FY 2024-25" },
    { ci: 11, monthsBack: 7, subtotal: 9500, status: "overdue", desc: "PAN & Tax Consultation" },
    { ci: 2, monthsBack: 6, subtotal: 55000, status: "overdue", desc: "Internal Audit - Q3" },
    { ci: 6, monthsBack: 8, subtotal: 110000, status: "overdue", interState: true, desc: "Cost Audit FY 2024-25" },
  ];

  let invCounter = 0;
  const paymentCreates: Prisma.PaymentCreateManyInput[] = [];
  for (const s of invSeeds) {
    invCounter += 1;
    const client = clients[s.ci];
    const subtotal = s.subtotal;
    const gst = subtotal * 0.18;
    const inter = !!s.interState;
    const cgst = inter ? 0 : gst / 2;
    const sgst = inter ? 0 : gst / 2;
    const igst = inter ? gst : 0;
    const total = subtotal + gst;
    const issuedAt = monthsAgo(s.monthsBack, 8);
    const dueDate =
      s.status === "overdue"
        ? new Date(issuedAt.getTime() + 15 * 24 * 60 * 60 * 1000) // past due
        : daysFromNow(20);

    const number = `INV-2627-${String(invCounter).padStart(4, "0")}`;
    const invoice = await prisma.invoice.create({
      data: {
        clientId: client.id,
        number,
        kind: s.kind ?? "invoice",
        description: s.desc,
        subtotal: dec(subtotal),
        cgst: dec(cgst),
        sgst: dec(sgst),
        igst: dec(igst),
        tax: dec(gst),
        total: dec(total),
        status: s.status,
        issuedAt,
        dueDate,
      },
      select: { id: true },
    });

    if (s.status === "paid") {
      paymentCreates.push({
        invoiceId: invoice.id,
        amount: dec(total),
        method: ["upi", "neft", "cheque", "cash"][invCounter % 4],
        status: "paid",
        paidAt: new Date(issuedAt.getTime() + 7 * 24 * 60 * 60 * 1000),
        reference: `TXN${100000 + invCounter}`,
      });
    } else if (s.status === "partial") {
      const paid = Math.round(total * (s.payFraction ?? 0.5));
      paymentCreates.push({
        invoiceId: invoice.id,
        amount: dec(paid),
        method: "neft",
        status: "partial",
        paidAt: new Date(issuedAt.getTime() + 10 * 24 * 60 * 60 * 1000),
        reference: `TXN${200000 + invCounter}`,
      });
    }
  }
  await prisma.payment.createMany({ data: paymentCreates });

  // ── Tasks (~14) across every status ─────────────────────────
  type TaskSeed = {
    title: string;
    status: "todo" | "progress" | "review" | "done";
    priority: "low" | "med" | "high";
    ci?: number;
    assignee: string;
    dueInDays: number;
    recurring?: boolean;
    desc?: string;
  };
  const taskSeeds: TaskSeed[] = [
    { title: "File GSTR-3B for June", status: "todo", priority: "high", ci: 2, assignee: staff.id, dueInDays: 8, recurring: true },
    { title: "Collect bank statements from client", status: "todo", priority: "med", ci: 4, assignee: admin.id, dueInDays: 5 },
    { title: "Prepare TDS return Q1", status: "todo", priority: "high", ci: 6, assignee: staff.id, dueInDays: 12 },
    { title: "Draft engagement letter", status: "todo", priority: "low", assignee: admin.id, dueInDays: 15 },
    { title: "Vouching of expense ledgers", status: "progress", priority: "high", ci: 6, assignee: admin.id, dueInDays: 4 },
    { title: "Reconcile GST input credit", status: "progress", priority: "med", ci: 10, assignee: staff.id, dueInDays: 6 },
    { title: "Compute capital gains", status: "progress", priority: "med", ci: 7, assignee: staff.id, dueInDays: 9 },
    { title: "Review draft audit report", status: "review", priority: "high", ci: 1, assignee: admin.id, dueInDays: 3 },
    { title: "Partner review of ITR computation", status: "review", priority: "med", ci: 0, assignee: admin.id, dueInDays: 2 },
    { title: "Verify ROC filing documents", status: "review", priority: "low", ci: 9, assignee: staff.id, dueInDays: 7 },
    { title: "Filed ITR for Ramesh Iyer", status: "done", priority: "med", ci: 0, assignee: admin.id, dueInDays: -5 },
    { title: "Completed GST registration", status: "done", priority: "high", ci: 5, assignee: staff.id, dueInDays: -12 },
    { title: "Submitted audit report", status: "done", priority: "high", ci: 6, assignee: admin.id, dueInDays: -3 },
    { title: "Filed TDS return Q4", status: "done", priority: "med", ci: 2, assignee: staff.id, dueInDays: -20, recurring: true },
  ];
  await prisma.task.createMany({
    data: taskSeeds.map((t) => ({
      clientId: t.ci !== undefined ? clients[t.ci].id : null,
      assigneeId: t.assignee,
      title: t.title,
      description: t.desc ?? null,
      priority: t.priority,
      status: t.status,
      dueDate: daysFromNow(t.dueInDays),
      recurring: t.recurring ?? false,
      updatedAt: t.status === "done" ? daysFromNow(Math.max(t.dueInDays, -25)) : NOW,
    })),
  });

  // ── Expenses (~10) ──────────────────────────────────────────
  const expenseSeeds = [
    { category: "Office Rent", amount: 45000, monthsBack: 0, notes: "July office rent" },
    { category: "Salaries", amount: 185000, monthsBack: 0, notes: "Staff salaries - July" },
    { category: "Software Subscriptions", amount: 12000, monthsBack: 1, notes: "Tally + ClearTax renewal" },
    { category: "Office Rent", amount: 45000, monthsBack: 1, notes: "June office rent" },
    { category: "Utilities", amount: 8500, monthsBack: 1, notes: "Electricity & internet" },
    { category: "Salaries", amount: 185000, monthsBack: 1, notes: "Staff salaries - June" },
    { category: "Professional Development", amount: 15000, monthsBack: 2, notes: "ICAI seminar fees" },
    { category: "Stationery & Printing", amount: 6200, monthsBack: 2, notes: "Letterheads & files" },
    { category: "Travel", amount: 9800, monthsBack: 3, notes: "Client site visit - Coimbatore" },
    { category: "Utilities", amount: 7900, monthsBack: 3, notes: "Electricity & internet" },
  ];
  await prisma.expense.createMany({
    data: expenseSeeds.map((e) => ({
      orgId: org.id,
      category: e.category,
      amount: dec(e.amount),
      date: monthsAgo(e.monthsBack, 3),
      notes: e.notes,
    })),
  });

  // ── Reminders / compliance (~8) ─────────────────────────────
  const reminderSeeds: {
    ci: number;
    title: string;
    type: "GST" | "ITR" | "TDS" | "ROC" | "LICENSE";
    dueInDays: number;
  }[] = [
    { ci: 2, title: "GSTR-3B filing - July", type: "GST", dueInDays: 16 },
    { ci: 4, title: "GSTR-1 filing - July", type: "GST", dueInDays: 7 },
    { ci: 0, title: "Advance Tax - Q2 instalment", type: "ITR", dueInDays: 12 },
    { ci: 6, title: "TDS payment - July", type: "TDS", dueInDays: 3 },
    { ci: 10, title: "GST Annual Return GSTR-9", type: "GST", dueInDays: 45 },
    { ci: 8, title: "ROC Annual Filing - AOC-4", type: "ROC", dueInDays: 60 },
    { ci: 1, title: "Trade License Renewal", type: "LICENSE", dueInDays: 90 },
    { ci: 6, title: "ROC MGT-7 Annual Return", type: "ROC", dueInDays: 75 },
  ];
  for (const r of reminderSeeds) {
    await prisma.reminder.create({
      data: {
        clientId: clients[r.ci].id,
        title: r.title,
        type: r.type,
        dueDate: daysFromNow(r.dueInDays),
        channel: "email",
        active: true,
      },
    });
  }

  // ── Notifications (for admin) ───────────────────────────────
  await prisma.notification.createMany({
    data: [
      { userId: admin.id, title: "Invoice INV-2627-0001 paid", body: "₹88,500 received from Sunrise Textiles", link: "/invoices", createdAt: daysFromNow(-1) },
      { userId: admin.id, title: "GSTR-3B due in 3 days", body: "Bright Steel Industries - TDS payment", link: "/compliance", createdAt: daysFromNow(-1) },
      { userId: admin.id, title: "New document uploaded", body: "Oceanic Exports uploaded IEC certificate", link: "/clients", readAt: daysFromNow(-2), createdAt: daysFromNow(-2) },
      { userId: staff.id, title: "Task assigned to you", body: "Reconcile GST input credit", link: "/tasks", createdAt: daysFromNow(-1) },
      { userId: admin.id, title: "Invoice overdue", body: "INV-2627-0018 for Bright Steel is overdue", link: "/invoices", createdAt: daysFromNow(-3) },
    ],
  });

  // ── Activity log ────────────────────────────────────────────
  await prisma.activityLog.createMany({
    data: [
      { orgId: org.id, actorId: admin.id, action: "created", entity: "client", entityId: clients[0].id, meta: { name: "Ramesh Iyer" }, createdAt: monthsAgo(2, 5) },
      { orgId: org.id, actorId: admin.id, action: "created", entity: "invoice", meta: { number: "INV-2627-0001" }, createdAt: daysFromNow(-2) },
      { orgId: org.id, actorId: staff.id, action: "recorded", entity: "payment", meta: { amount: 88500 }, createdAt: daysFromNow(-1) },
      { orgId: org.id, actorId: admin.id, action: "completed", entity: "task", meta: { title: "Submitted audit report" }, createdAt: daysFromNow(-3) },
      { orgId: org.id, actorId: staff.id, action: "updated", entity: "client", entityId: clients[4].id, meta: { name: "Green Valley Foods LLP" }, createdAt: daysFromNow(-4) },
      { orgId: org.id, actorId: admin.id, action: "sent", entity: "reminder", meta: { type: "GST" }, createdAt: daysFromNow(-5) },
    ],
  });

  console.log("Seeded demo data for Demo CA Firm:");
  console.log(`  users:         2 (admin@audithub.local / admin@1234, priya@audithub.local)`);
  console.log(`  services:      ${services.length}`);
  console.log(`  clients:       ${clients.length}`);
  console.log(`  invoices:      ${invSeeds.length}`);
  console.log(`  payments:      ${paymentCreates.length}`);
  console.log(`  tasks:         ${taskSeeds.length}`);
  console.log(`  expenses:      ${expenseSeeds.length}`);
  console.log(`  reminders:     ${reminderSeeds.length}`);
  console.log(`  notifications: 5`);
  console.log(`  activityLogs:  6`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
