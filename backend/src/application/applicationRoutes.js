const express = require('express');
const { apply, cancel, findApplicantsByPromotionId } = require('./applicationQueries');
const { findById } = require('../promotion/promotionQueries');
const { requireRole } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.post('/', requireRole('PARTICIPANT'), async (req, res, next) => {
  try {
    const promotion = await findById(req.params.promotionId);

    if (!promotion) {
      const err = new Error('프로모션을 찾을 수 없습니다');
      err.statusCode = 404;
      return next(err);
    }

    const today = new Date().toISOString().slice(0, 10);

    if (today < promotion.applyStartAt || today > promotion.applyEndAt) {
      const err = new Error('신청 기간이 아닙니다');
      err.statusCode = 400;
      return next(err);
    }

    const result = await apply({ promotionId: req.params.promotionId, userId: req.user.id });

    if (result.full) {
      const err = new Error('모집 인원이 마감되었습니다');
      err.statusCode = 400;
      return next(err);
    }

    if (result.duplicate) {
      const err = new Error('이미 신청한 프로모션입니다');
      err.statusCode = 409;
      return next(err);
    }

    res.status(201).json(result.application);
  } catch (err) {
    next(err);
  }
});

router.get('/', requireRole('MANAGER'), async (req, res, next) => {
  try {
    const promotion = await findById(req.params.promotionId);

    if (!promotion) {
      const err = new Error('프로모션을 찾을 수 없습니다');
      err.statusCode = 404;
      return next(err);
    }

    if (promotion.managerId !== req.user.id) {
      const err = new Error('본인이 등록한 프로모션만 조회할 수 있습니다');
      err.statusCode = 403;
      return next(err);
    }

    const applicants = await findApplicantsByPromotionId(promotion.id);

    res.json({
      promotionId: promotion.id,
      title: promotion.title,
      capacity: promotion.capacity,
      appliedCount: promotion.appliedCount,
      applicants,
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/me', requireRole('PARTICIPANT'), async (req, res, next) => {
  try {
    const promotion = await findById(req.params.promotionId);

    if (!promotion) {
      const err = new Error('프로모션을 찾을 수 없습니다');
      err.statusCode = 404;
      return next(err);
    }

    const result = await cancel({ promotionId: req.params.promotionId, userId: req.user.id });

    if (result.notFound) {
      const err = new Error('신청 내역이 없습니다');
      err.statusCode = 403;
      return next(err);
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
