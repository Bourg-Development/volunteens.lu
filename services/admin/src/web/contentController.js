const { Content, CONTENT_PAGES } = require('../database');
const servicesConfig = require('../config/services');
const logger = require('../utils/logger');

// Page section configurations for the edit form
const PAGE_SECTIONS = {
    home: [
        { group: 'Hero Section', sections: [
            { key: 'hero_title', label: 'Hero Title', type: 'text' },
            { key: 'hero_subtitle', label: 'Hero Subtitle', type: 'textarea' },
            { key: 'hero_cta', label: 'Hero Button Text', type: 'text' },
        ]},
        { group: 'Features Section', sections: [
            { key: 'features_title', label: 'Section Title', type: 'text' },
            { key: 'features_subtitle', label: 'Section Subtitle', type: 'textarea' },
            { key: 'feature_1_title', label: 'Feature 1 Title', type: 'text' },
            { key: 'feature_1_text', label: 'Feature 1 Description', type: 'textarea' },
            { key: 'feature_2_title', label: 'Feature 2 Title', type: 'text' },
            { key: 'feature_2_text', label: 'Feature 2 Description', type: 'textarea' },
            { key: 'feature_3_title', label: 'Feature 3 Title', type: 'text' },
            { key: 'feature_3_text', label: 'Feature 3 Description', type: 'textarea' },
        ]},
        { group: 'Mission Section', sections: [
            { key: 'mission_title', label: 'Mission Title', type: 'text' },
            { key: 'mission_text', label: 'Mission Text', type: 'textarea' },
        ]},
        { group: 'Story Section', sections: [
            { key: 'story_title', label: 'Story Title', type: 'text' },
            { key: 'story_text', label: 'Story Text', type: 'textarea' },
        ]},
        { group: 'Call to Action', sections: [
            { key: 'cta_title', label: 'CTA Title', type: 'text' },
            { key: 'cta_text', label: 'CTA Text', type: 'textarea' },
            { key: 'cta_button', label: 'CTA Button Text', type: 'text' },
        ]},
        { group: 'Statistics', sections: [
            { key: 'stat_1_value', label: 'Stat 1 Value', type: 'text' },
            { key: 'stat_1_label', label: 'Stat 1 Label', type: 'text' },
            { key: 'stat_2_value', label: 'Stat 2 Value', type: 'text' },
            { key: 'stat_2_label', label: 'Stat 2 Label', type: 'text' },
            { key: 'stat_3_value', label: 'Stat 3 Value', type: 'text' },
            { key: 'stat_3_label', label: 'Stat 3 Label', type: 'text' },
            { key: 'stat_4_value', label: 'Stat 4 Value', type: 'text' },
            { key: 'stat_4_label', label: 'Stat 4 Label', type: 'text' },
        ]},
    ],
    about: [
        { group: 'Hero Section', sections: [
            { key: 'hero_title', label: 'Hero Title', type: 'text' },
            { key: 'hero_subtitle', label: 'Hero Subtitle', type: 'textarea' },
        ]},
        { group: 'Who We Are', sections: [
            { key: 'whoweare_title', label: 'Section Title', type: 'text' },
            { key: 'whoweare_text', label: 'Section Text', type: 'textarea' },
        ]},
        { group: 'Timeline', sections: [
            { key: 'timeline_title', label: 'Timeline Title', type: 'text' },
            { key: 'timeline_1_year', label: 'Year 1', type: 'text' },
            { key: 'timeline_1_title', label: 'Title 1', type: 'text' },
            { key: 'timeline_1_text', label: 'Description 1', type: 'textarea' },
            { key: 'timeline_2_year', label: 'Year 2', type: 'text' },
            { key: 'timeline_2_title', label: 'Title 2', type: 'text' },
            { key: 'timeline_2_text', label: 'Description 2', type: 'textarea' },
            { key: 'timeline_3_year', label: 'Year 3', type: 'text' },
            { key: 'timeline_3_title', label: 'Title 3', type: 'text' },
            { key: 'timeline_3_text', label: 'Description 3', type: 'textarea' },
            { key: 'timeline_4_year', label: 'Year 4', type: 'text' },
            { key: 'timeline_4_title', label: 'Title 4', type: 'text' },
            { key: 'timeline_4_text', label: 'Description 4', type: 'textarea' },
            { key: 'timeline_5_year', label: 'Year 5', type: 'text' },
            { key: 'timeline_5_title', label: 'Title 5', type: 'text' },
            { key: 'timeline_5_text', label: 'Description 5', type: 'textarea' },
        ]},
        { group: 'Team Members', sections: [
            { key: 'team_title', label: 'Team Section Title', type: 'text' },
            { key: 'team_1_name', label: 'Member 1 Name', type: 'text' },
            { key: 'team_1_role', label: 'Member 1 Role', type: 'text' },
            { key: 'team_1_bio', label: 'Member 1 Bio', type: 'textarea' },
            { key: 'team_2_name', label: 'Member 2 Name', type: 'text' },
            { key: 'team_2_role', label: 'Member 2 Role', type: 'text' },
            { key: 'team_2_bio', label: 'Member 2 Bio', type: 'textarea' },
            { key: 'team_3_name', label: 'Member 3 Name', type: 'text' },
            { key: 'team_3_role', label: 'Member 3 Role', type: 'text' },
            { key: 'team_3_bio', label: 'Member 3 Bio', type: 'textarea' },
            { key: 'team_4_name', label: 'Member 4 Name', type: 'text' },
            { key: 'team_4_role', label: 'Member 4 Role', type: 'text' },
            { key: 'team_4_bio', label: 'Member 4 Bio', type: 'textarea' },
        ]},
        { group: 'CTA - Organizations', sections: [
            { key: 'cta_org_title', label: 'CTA Title', type: 'text' },
            { key: 'cta_org_text', label: 'CTA Text', type: 'textarea' },
            { key: 'cta_org_button', label: 'CTA Button', type: 'text' },
        ]},
        { group: 'CTA - Students', sections: [
            { key: 'cta_student_title', label: 'CTA Title', type: 'text' },
            { key: 'cta_student_text', label: 'CTA Text', type: 'textarea' },
            { key: 'cta_student_button', label: 'CTA Button', type: 'text' },
        ]},
    ],
    events: [
        { group: 'Hero Section', sections: [
            { key: 'hero_title', label: 'Page Title', type: 'text' },
            { key: 'hero_subtitle', label: 'Page Subtitle', type: 'textarea' },
        ]},
    ],
};

const PAGE_LABELS = {
    home: 'Home Page',
    about: 'About Page',
    events: 'Events Page',
};

// Content management page
exports.contentPage = async (req, res) => {
    try {
        res.render('pages/content', {
            title: 'Content Management',
            user: req.user,
            authUrl: servicesConfig.auth,
            pages: CONTENT_PAGES,
            pageLabels: PAGE_LABELS,
            msg: req.query.msg,
            success: req.query.success === '1',
        });
    } catch (err) {
        logger.error('Content page error:', err);
        res.status(500).render('pages/content', {
            title: 'Content Management',
            user: req.user,
            authUrl: servicesConfig.auth,
            pages: CONTENT_PAGES,
            pageLabels: PAGE_LABELS,
            msg: 'Error loading content',
            success: false,
        });
    }
};

// Edit page content
exports.editPageContent = async (req, res) => {
    try {
        const { pageKey } = req.params;

        if (!PAGE_SECTIONS[pageKey]) {
            return res.redirect('/content?msg=Page not found&success=0');
        }

        const content = await Content.findAll({
            where: { pageKey },
            order: [['sectionKey', 'ASC']],
        });

        const sections = {};
        content.forEach(item => {
            sections[item.sectionKey] = item;
        });

        res.render('pages/content-edit', {
            title: `Edit ${PAGE_LABELS[pageKey] || pageKey} Content`,
            user: req.user,
            authUrl: servicesConfig.auth,
            pageKey,
            pageLabel: PAGE_LABELS[pageKey] || pageKey,
            sections,
            pageGroups: PAGE_SECTIONS[pageKey] || [],
            msg: req.query.msg,
            success: req.query.success === '1',
        });
    } catch (err) {
        logger.error('Edit content page error:', err);
        res.redirect('/content?msg=Error loading content&success=0');
    }
};

// Update page content (form submission)
exports.updatePageContent = async (req, res) => {
    try {
        const { pageKey } = req.params;
        const formData = req.body;

        let updated = 0;
        for (const [sectionKey, content] of Object.entries(formData)) {
            if (sectionKey.startsWith('_')) continue; // Skip any hidden fields

            let item = await Content.findOne({
                where: { pageKey, sectionKey },
            });

            if (item) {
                item.content = content;
                item.updatedBy = req.user?.id;
                await item.save();
            } else {
                await Content.create({
                    pageKey,
                    sectionKey,
                    content,
                    contentType: 'text',
                    updatedBy: req.user?.id,
                });
            }
            updated++;
        }

        logger.info(`Content updated: ${pageKey} (${updated} sections) by ${req.user?.email}`);
        res.redirect(`/content/${pageKey}?msg=Content updated successfully&success=1`);
    } catch (err) {
        logger.error('Update content error:', err);
        res.redirect(`/content/${req.params.pageKey}?msg=Error updating content&success=0`);
    }
};
