const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const CONTENT_PAGES = {
    HOME: 'home',
    ABOUT: 'about',
    EVENTS: 'events',
};

const Content = sequelize.define('Content', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    pageKey: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    sectionKey: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    contentType: {
        type: DataTypes.ENUM('text', 'html', 'json'),
        defaultValue: 'text',
    },
    updatedBy: {
        type: DataTypes.UUID,
        allowNull: true,
    },
}, {
    tableName: 'content',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['pageKey', 'sectionKey'],
        },
    ],
});

// Default content for initial setup
const DEFAULT_CONTENT = [
    // ========== HOME PAGE ==========
    // Hero
    { pageKey: 'home', sectionKey: 'hero_title', content: 'Empowering Youth Through Volunteer Action', contentType: 'text' },
    { pageKey: 'home', sectionKey: 'hero_subtitle', content: 'Connect with meaningful opportunities and make a difference in your community.', contentType: 'text' },
    { pageKey: 'home', sectionKey: 'hero_cta', content: 'Get Started', contentType: 'text' },

    // Features
    { pageKey: 'home', sectionKey: 'features_title', content: 'Why Choose Volunteens?', contentType: 'text' },
    { pageKey: 'home', sectionKey: 'features_subtitle', content: 'We make volunteering easy, rewarding, and impactful', contentType: 'text' },
    { pageKey: 'home', sectionKey: 'feature_1_title', content: 'Find Opportunities', contentType: 'text' },
    { pageKey: 'home', sectionKey: 'feature_1_text', content: 'Browse through hundreds of volunteer opportunities that match your interests and schedule.', contentType: 'text' },
    { pageKey: 'home', sectionKey: 'feature_2_title', content: 'Track Your Impact', contentType: 'text' },
    { pageKey: 'home', sectionKey: 'feature_2_text', content: 'Log your volunteer hours and see the difference you\'re making in your community.', contentType: 'text' },
    { pageKey: 'home', sectionKey: 'feature_3_title', content: 'Get Recognized', contentType: 'text' },
    { pageKey: 'home', sectionKey: 'feature_3_text', content: 'Earn certificates and rewards for your volunteer work to showcase your commitment.', contentType: 'text' },

    // Mission
    { pageKey: 'home', sectionKey: 'mission_title', content: 'Our Mission', contentType: 'text' },
    { pageKey: 'home', sectionKey: 'mission_text', content: 'We connect young volunteers with organizations that need their energy and enthusiasm. Our platform makes it easy to find, track, and get recognized for volunteer work.', contentType: 'text' },

    // Story
    { pageKey: 'home', sectionKey: 'story_title', content: 'Our Story', contentType: 'text' },
    { pageKey: 'home', sectionKey: 'story_text', content: 'Founded with a passion for youth empowerment, Volunteens has grown into a thriving community connecting thousands of young volunteers with meaningful opportunities across Luxembourg and beyond.', contentType: 'text' },

    // CTA
    { pageKey: 'home', sectionKey: 'cta_title', content: 'Ready to Make a Difference?', contentType: 'text' },
    { pageKey: 'home', sectionKey: 'cta_text', content: 'Join thousands of young volunteers who are already making an impact.', contentType: 'text' },
    { pageKey: 'home', sectionKey: 'cta_button', content: 'Sign Up Now', contentType: 'text' },

    // Stats
    { pageKey: 'home', sectionKey: 'stat_1_value', content: '50K+', contentType: 'text' },
    { pageKey: 'home', sectionKey: 'stat_1_label', content: 'Active Volunteers', contentType: 'text' },
    { pageKey: 'home', sectionKey: 'stat_2_value', content: '99.9%', contentType: 'text' },
    { pageKey: 'home', sectionKey: 'stat_2_label', content: 'Satisfaction Rate', contentType: 'text' },
    { pageKey: 'home', sectionKey: 'stat_3_value', content: '24/7', contentType: 'text' },
    { pageKey: 'home', sectionKey: 'stat_3_label', content: 'Support Available', contentType: 'text' },
    { pageKey: 'home', sectionKey: 'stat_4_value', content: '150+', contentType: 'text' },
    { pageKey: 'home', sectionKey: 'stat_4_label', content: 'Events Per Year', contentType: 'text' },

    // ========== ABOUT PAGE ==========
    // Hero
    { pageKey: 'about', sectionKey: 'hero_title', content: 'About Volunteens', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'hero_subtitle', content: 'Empowering young people to make a difference in their communities.', contentType: 'text' },

    // Who We Are
    { pageKey: 'about', sectionKey: 'whoweare_title', content: 'Who We Are', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'whoweare_text', content: 'Volunteens is a platform dedicated to connecting young volunteers with organizations that need their help. We believe in the power of youth to create positive change and provide the tools to make volunteering accessible, rewarding, and impactful.', contentType: 'text' },

    // Timeline
    { pageKey: 'about', sectionKey: 'timeline_title', content: 'Our Journey', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'timeline_1_year', content: '2020', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'timeline_1_title', content: 'Foundation', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'timeline_1_text', content: 'Volunteens was founded with a mission to connect young people with volunteer opportunities.', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'timeline_2_year', content: '2021', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'timeline_2_title', content: 'First Milestone', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'timeline_2_text', content: 'Reached our first 1,000 registered volunteers and partnered with 50 organizations.', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'timeline_3_year', content: '2022', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'timeline_3_title', content: 'Growth & Expansion', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'timeline_3_text', content: 'Expanded our platform with new features and grew to serve the entire Luxembourg region.', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'timeline_4_year', content: '2023', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'timeline_4_title', content: 'New Programs', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'timeline_4_text', content: 'Launched new programs including summer volunteer camps and school partnerships.', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'timeline_5_year', content: '2024', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'timeline_5_title', content: 'Looking Forward', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'timeline_5_text', content: 'Continuing to grow and innovate, with plans to expand across Europe.', contentType: 'text' },

    // Team
    { pageKey: 'about', sectionKey: 'team_title', content: 'Volunteens Team', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'team_1_name', content: 'Max Mustermann', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'team_1_role', content: 'CEO', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'team_1_bio', content: 'Passionate about youth empowerment and social impact.', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'team_2_name', content: 'Jempi Mustermann', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'team_2_role', content: 'CFO', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'team_2_bio', content: 'Expert in nonprofit finance and sustainable growth.', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'team_3_name', content: 'Alex Mustermann', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'team_3_role', content: 'CTO', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'team_3_bio', content: 'Building technology that connects communities.', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'team_4_name', content: 'Hugo Mustermann', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'team_4_role', content: 'COO', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'team_4_bio', content: 'Ensuring smooth operations and volunteer satisfaction.', contentType: 'text' },

    // CTA
    { pageKey: 'about', sectionKey: 'cta_org_title', content: 'Need Motivated Helpers?', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'cta_org_text', content: 'Partner with us to find dedicated young volunteers for your organization.', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'cta_org_button', content: 'Find Your Team', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'cta_student_title', content: 'Are You a Student?', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'cta_student_text', content: 'Start your volunteer journey today and make a real difference.', contentType: 'text' },
    { pageKey: 'about', sectionKey: 'cta_student_button', content: 'Start Your Journey', contentType: 'text' },

    // ========== EVENTS PAGE ==========
    { pageKey: 'events', sectionKey: 'hero_title', content: 'Upcoming Events', contentType: 'text' },
    { pageKey: 'events', sectionKey: 'hero_subtitle', content: 'Discover volunteer opportunities and make a difference in your community', contentType: 'text' },
];

async function ensureDefaultContent() {
    for (const item of DEFAULT_CONTENT) {
        const existing = await Content.findOne({
            where: { pageKey: item.pageKey, sectionKey: item.sectionKey }
        });
        if (!existing) {
            await Content.create(item);
        }
    }
}

module.exports = { Content, CONTENT_PAGES, ensureDefaultContent };
