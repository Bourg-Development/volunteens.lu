const { Content, CONTENT_PAGES, CONTENT_SECTIONS } = require('../../../database');
const logger = require('../../../utils/logger');

// Get all content (admin)
exports.listAll = async (req, res) => {
    try {
        const content = await Content.findAll({
            order: [['pageKey', 'ASC'], ['sectionKey', 'ASC']],
        });

        // Group by page
        const grouped = {};
        content.forEach(item => {
            if (!grouped[item.pageKey]) {
                grouped[item.pageKey] = {};
            }
            grouped[item.pageKey][item.sectionKey] = {
                id: item.id,
                content: item.content,
                contentType: item.contentType,
                updatedAt: item.updatedAt,
            };
        });

        res.json({
            success: true,
            content: grouped,
            pages: CONTENT_PAGES,
            sections: CONTENT_SECTIONS,
        });
    } catch (err) {
        logger.error('Error fetching content:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch content' });
    }
};

// Get content for a specific page (admin)
exports.getPage = async (req, res) => {
    try {
        const { pageKey } = req.params;

        const content = await Content.findAll({
            where: { pageKey },
            order: [['sectionKey', 'ASC']],
        });

        const sections = {};
        content.forEach(item => {
            sections[item.sectionKey] = {
                id: item.id,
                content: item.content,
                contentType: item.contentType,
                updatedAt: item.updatedAt,
            };
        });

        res.json({
            success: true,
            pageKey,
            sections,
        });
    } catch (err) {
        logger.error('Error fetching page content:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch content' });
    }
};

// Update a content section (admin)
exports.updateSection = async (req, res) => {
    try {
        const { pageKey, sectionKey } = req.params;
        const { content } = req.body;

        if (content === undefined || content === null) {
            return res.status(400).json({ success: false, error: 'Content is required' });
        }

        let item = await Content.findOne({
            where: { pageKey, sectionKey },
        });

        if (item) {
            item.content = content;
            item.updatedBy = req.user?.id;
            await item.save();
        } else {
            item = await Content.create({
                pageKey,
                sectionKey,
                content,
                contentType: 'text',
                updatedBy: req.user?.id,
            });
        }

        logger.info(`Content updated: ${pageKey}/${sectionKey} by ${req.user?.email}`);

        res.json({
            success: true,
            message: 'Content updated successfully',
            item: {
                id: item.id,
                pageKey: item.pageKey,
                sectionKey: item.sectionKey,
                content: item.content,
                updatedAt: item.updatedAt,
            },
        });
    } catch (err) {
        logger.error('Error updating content:', err);
        res.status(500).json({ success: false, error: 'Failed to update content' });
    }
};

// Bulk update content for a page (admin)
exports.bulkUpdate = async (req, res) => {
    try {
        const { pageKey } = req.params;
        const { sections } = req.body;

        if (!sections || typeof sections !== 'object') {
            return res.status(400).json({ success: false, error: 'Sections object is required' });
        }

        const updated = [];
        for (const [sectionKey, content] of Object.entries(sections)) {
            let item = await Content.findOne({
                where: { pageKey, sectionKey },
            });

            if (item) {
                item.content = content;
                item.updatedBy = req.user?.id;
                await item.save();
            } else {
                item = await Content.create({
                    pageKey,
                    sectionKey,
                    content,
                    contentType: 'text',
                    updatedBy: req.user?.id,
                });
            }
            updated.push(sectionKey);
        }

        logger.info(`Bulk content update: ${pageKey} (${updated.length} sections) by ${req.user?.email}`);

        res.json({
            success: true,
            message: `Updated ${updated.length} sections`,
            updated,
        });
    } catch (err) {
        logger.error('Error bulk updating content:', err);
        res.status(500).json({ success: false, error: 'Failed to update content' });
    }
};

// Public: Get content for a page (for web-ui)
exports.getPublicPage = async (req, res) => {
    try {
        const { pageKey } = req.params;

        const content = await Content.findAll({
            where: { pageKey },
            attributes: ['sectionKey', 'content', 'contentType'],
        });

        const sections = {};
        content.forEach(item => {
            sections[item.sectionKey] = item.content;
        });

        res.json({
            success: true,
            pageKey,
            content: sections,
        });
    } catch (err) {
        logger.error('Error fetching public content:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch content' });
    }
};

// Public: Get all content (for web-ui)
exports.getPublicAll = async (req, res) => {
    try {
        const content = await Content.findAll({
            attributes: ['pageKey', 'sectionKey', 'content'],
        });

        const grouped = {};
        content.forEach(item => {
            if (!grouped[item.pageKey]) {
                grouped[item.pageKey] = {};
            }
            grouped[item.pageKey][item.sectionKey] = item.content;
        });

        res.json({
            success: true,
            content: grouped,
        });
    } catch (err) {
        logger.error('Error fetching public content:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch content' });
    }
};
