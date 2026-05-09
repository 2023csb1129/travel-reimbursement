"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("🌱 Starting database seed...");
    // 1. Create Admin User First (so they can be the creator of the group)
    const adminPassword = await bcryptjs_1.default.hash("admin123", 10);
    let adminUser = await prisma.user.findFirst({
        where: { email: "admin@iitropar.ac.in" },
    });
    if (!adminUser) {
        adminUser = await prisma.user.create({
            data: {
                email: "admin@iitropar.ac.in",
                password: adminPassword,
                name: "Administrator",
                username: "admin_iit",
                role: "ADMINISTRATOR",
                empCode: "ADM001",
                designation: "Administrator",
                department: "Administration",
            },
        });
    }
    console.log(`✓ Admin user created: ${adminUser.email}`);
    // 2. Create the Group
    const group = await prisma.group.upsert({
        where: { groupId: "IITRPR_001" },
        update: {},
        create: {
            groupId: "IITRPR_001",
            secretKey: "SEC_IITRPR_2026",
            name: "IIT Ropar - Computer Science",
            description: "Default department group for CS",
            createdById: adminUser.id,
        },
    });
    console.log(`✓ Group created: ${group.name}`);
    // 3. Make Admin the Head of the Group
    await prisma.groupMembership.upsert({
        where: {
            groupId_userId: {
                groupId: group.id,
                userId: adminUser.id,
            },
        },
        update: {},
        create: {
            groupId: group.id,
            userId: adminUser.id,
            role: "HEAD",
        },
    });
    // 4. Create Sample Submitter User
    const submitterPassword = await bcryptjs_1.default.hash("submitter123", 10);
    let submitterUser = await prisma.user.findFirst({
        where: { email: "user@iitropar.ac.in" },
    });
    if (!submitterUser) {
        submitterUser = await prisma.user.create({
            data: {
                email: "user@iitropar.ac.in",
                password: submitterPassword,
                name: "Dhruv Yadav",
                username: "dhruv_yadav",
                role: "SUBMITTER",
                empCode: "EMP001",
                designation: "Research Scholar",
                department: "Computer Science",
            },
        });
    }
    console.log(`✓ Submitter user created: ${submitterUser.email}`);
    // 5. Add Submitter to the Group as a Member
    await prisma.groupMembership.upsert({
        where: {
            groupId_userId: {
                groupId: group.id,
                userId: submitterUser.id,
            },
        },
        update: {},
        create: {
            groupId: group.id,
            userId: submitterUser.id,
            role: "MEMBER",
        },
    });
    // 6. Create sample FormTemplate
    const templateSchema = {
        fields: [
            {
                id: "travel_details",
                type: "section",
                title: "Travel Details",
                fields: [
                    { id: "from", type: "text", label: "From", required: true },
                    { id: "to", type: "text", label: "To", required: true },
                    { id: "mode", type: "select", label: "Mode", options: ["Flight", "Train", "Bus", "Car"], required: true },
                    { id: "distance_km", type: "number", label: "Distance (km)" },
                ],
            },
            {
                id: "accommodation",
                type: "section",
                title: "Accommodation & Others",
                fields: [
                    { id: "vendor_name", type: "text", label: "Vendor Name" },
                    { id: "num_days", type: "number", label: "Number of Days" },
                    { id: "gstin", type: "text", label: "GSTIN (if applicable)" },
                ],
            },
        ],
        version: 1,
        createdAt: new Date().toISOString(),
    };
    const formTemplate = await prisma.formTemplate.findFirst({
        where: {
            title: "Business Trip Reimbursement Form",
            groupId: group.id,
        },
    });
    if (!formTemplate) {
        await prisma.formTemplate.create({
            data: {
                title: "Business Trip Reimbursement Form",
                description: "Standard form for submitting business trip expenses",
                groupId: group.id,
                createdById: adminUser.id,
                templateSchema: JSON.stringify(templateSchema),
                version: 1,
                isActive: true,
            },
        });
        console.log(`✓ Form template created: Business Trip Reimbursement Form`);
    }
    else {
        console.log(`✓ Form template already exists: Business Trip Reimbursement Form`);
    }
    // 7. Create sample Trip
    const existingTrip = await prisma.trip.findFirst({
        where: {
            title: "Conference Visit - Delhi",
            userId: submitterUser.id,
        },
    });
    if (!existingTrip) {
        const trip = await prisma.trip.create({
            data: {
                title: "Conference Visit - Delhi",
                startDate: new Date("2024-05-15"),
                userId: submitterUser.id,
                purpose: "Research conference attendance",
                budgetHead: "Conference Travel",
                advanceDrawn: 10000,
                notes: "3-day conference trip to Delhi",
            },
        });
        console.log(`✓ Trip created: ${trip.title}`);
    }
    else {
        console.log(`✓ Trip already exists: Conference Visit - Delhi`);
    }
    console.log("✅ Database seeding completed successfully!");
}
main()
    .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
})
    .finally(() => {
    prisma.$disconnect();
});
