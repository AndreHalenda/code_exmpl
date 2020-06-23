import { AppointmentController } from './appointment.controller';
import { AppointmentEngineClient } from 'appointment-engine-sdk';
import { DealerClient } from 'dealer-sdk';
import { injectStore } from 'lambda-core';
import { AppointmentSlotsService } from '../services';

injectStore.set('AppointmentSlotsService', { create: AppointmentSlotsService.getInstance });

const stage = process.env.STAGE;
const engine = new AppointmentEngineClient({ stage, xray: true });
const dealer = new DealerClient({ stage, xray: true });

module.exports = new AppointmentController(engine, dealer);
