const express = require('express');
const { create, findAll, findById, update, remove } = require('./promotionQueries');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const list = await findAll();
    res.json(list);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const promotion = await findById(req.params.id);

    if (!promotion) {
      const err = new Error('프로모션을 찾을 수 없습니다');
      err.statusCode = 404;
      return next(err);
    }

    res.json(promotion);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('MANAGER'), async (req, res, next) => {
  const { title, description, applyStartAt, applyEndAt, eventDate, capacity } = req.body;

  if (!title || !description || !applyStartAt || !applyEndAt || !eventDate || !capacity) {
    const err = new Error('title, description, applyStartAt, applyEndAt, eventDate, capacity는 필수입니다');
    err.statusCode = 400;
    return next(err);
  }

  if (new Date(eventDate) < new Date(applyEndAt)) {
    const err = new Error('진행일은 신청 종료일 이후여야 합니다');
    err.statusCode = 400;
    return next(err);
  }

  try {
    const promotion = await create({
      managerId: req.user.id,
      title,
      description,
      applyStartAt,
      applyEndAt,
      eventDate,
      capacity,
    });

    res.status(201).json(promotion);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const promotion = await findById(req.params.id);

    if (!promotion) {
      const err = new Error('프로모션을 찾을 수 없습니다');
      err.statusCode = 404;
      return next(err);
    }

    if (promotion.managerId !== req.user.id) {
      const err = new Error('등록자 본인만 수정할 수 있습니다');
      err.statusCode = 403;
      return next(err);
    }

    const { title, description, applyStartAt, applyEndAt, eventDate, capacity } = req.body;

    if (capacity !== undefined && capacity < promotion.appliedCount) {
      const err = new Error('모집 인원을 현재 신청 인원 미만으로 축소할 수 없습니다');
      err.statusCode = 400;
      return next(err);
    }

    const finalApplyEndAt = applyEndAt !== undefined ? applyEndAt : promotion.applyEndAt;
    const finalEventDate = eventDate !== undefined ? eventDate : promotion.eventDate;

    if (new Date(finalEventDate) < new Date(finalApplyEndAt)) {
      const err = new Error('진행일은 신청 종료일 이후여야 합니다');
      err.statusCode = 400;
      return next(err);
    }

    const updated = await update(req.params.id, { title, description, applyStartAt, applyEndAt, eventDate, capacity });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const promotion = await findById(req.params.id);

    if (!promotion) {
      const err = new Error('프로모션을 찾을 수 없습니다');
      err.statusCode = 404;
      return next(err);
    }

    if (promotion.managerId !== req.user.id) {
      const err = new Error('등록자 본인만 삭제할 수 있습니다');
      err.statusCode = 403;
      return next(err);
    }

    await remove(promotion.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
