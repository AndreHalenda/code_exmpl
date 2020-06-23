import { DealerClient, IDealerResponse, IDealerWithDistance, APPOINTMENT_ENGINES } from 'dealer-sdk';
import * as moment from 'moment';
import {
    APPOINTMENT_PROVIDERS,
    AppointmentEngineClient,
    IFreeAppointmentSlotsRequest,
    IFreeAppointmentSlotsResponse,
    IFreeSlot,
} from 'appointment-engine-sdk';

import { IBaseFreeSlotsRequest, IDealer, IFreeSlotsRequest, IFreeSlotsResponse, ITimeSlot } from 'appointment-interface';
import { IDealersMapValue } from './slots.interface';
import { HttpError, ResponseCode } from 'lambda-core';

const stage = process.env.STAGE;

export class AppointmentSlotsService {
    protected readonly DATE_FORMAT = 'YYYY-MM-DD';
    protected readonly HOUR_FORMAT = 'HH:mm:ss';
    protected readonly dealer = new DealerClient({ stage, xray: true });
    protected readonly appointmentEngine = new AppointmentEngineClient({ stage, xray: true });

    public async getFreeSlots(query: IFreeSlotsRequest): Promise<IFreeSlotsResponse> {

        let { dealers } = await this.getDealersByLocation(query);

        dealers = dealers.filter((record: IDealerWithDistance) => !!record.dealer.appointmentEngine);
        if (dealers.length === 0) {
            return [];
        }

        const dealersMap = new Map<string, IDealersMapValue>();

        const request = <IFreeAppointmentSlotsRequest>dealers.map(({ distance, dealer }) => {
            dealersMap.set(dealer.agencyId, Object.assign(dealer, { distance }));

            return this.buildDealerSlotsQuery(dealer, query);
        });

        const dealerSlots = await this.getDealerSlots(request);
        if (dealerSlots.length === 0) {
            return [];
        }

        return this.populateDealerFreeSlots(dealersMap, dealerSlots);
    }

    public async getFreeSlotsByDealer(id: string, query: IBaseFreeSlotsRequest): Promise<IDealer> {
        try {
            const dealer = await this.dealer.invokeGetById(id, { installer: true });
            const request = this.buildDealerSlotsQuery(dealer, query);
            const [dealerSlots] = await this.getDealerSlots([request]);
            if (!dealer.appointmentEngine) {
                throw new HttpError(ResponseCode.BAD_REQUEST, 'Dealer is not available.');
            }
            if (dealerSlots && dealerSlots.freeSlots) {
                return this.populateDealerData(id, dealer, dealerSlots.freeSlots);
            }
            return this.populateDealerData(id, dealer);
        } catch (error) {
            throw new HttpError(ResponseCode.BAD_REQUEST, 'Dealer is not available.');
        }
    }

    private getDealersByLocation(query: IFreeSlotsRequest) {

        return this.dealer.invokeFindByLocation({
            latitude: query.latitude,
            longitude: query.longitude,
            distance: query.distance,
            country: query.country,
            channel: query.channel,
            installer: true,
            pageSize: 100000,
        });
    }

    private getDealerSlots(body: IFreeAppointmentSlotsRequest): Promise<IFreeAppointmentSlotsResponse> {
        return this.appointmentEngine.getFreeSlots(body);
    }

    private populateTimeSlots(slots: IFreeSlot[]): ITimeSlot[] {
        return slots.map(({ start, end }) => {
            const startDate = moment(start, moment.ISO_8601);

            return {
                date: startDate.format(this.DATE_FORMAT),
                startSlot: startDate.format(this.HOUR_FORMAT),
                endSlot: moment(end, moment.ISO_8601).format(this.HOUR_FORMAT),
            };
        });
    }

    private populateDealerData(dealerId: string, dealerData: IDealerResponse & IDealersMapValue, freeSlots: IFreeSlot[] = []): IDealer {
        const response = {
            dealerId,
            dealerName: dealerData.name,
            timeSlot: this.populateTimeSlots(freeSlots),
            address: dealerData.address,
            geoPoint: dealerData.geoPoint,
        };

        if (dealerData.distance) {
            Object.assign(response, { distance: dealerData.distance });
        }

        return response;
    }

    private populateDealerFreeSlots(dealersMap: Map<string, IDealersMapValue>, dealerSlots: IFreeAppointmentSlotsResponse = []): IFreeSlotsResponse {
        return dealerSlots.map(({ dealerId, freeSlots }) => {
            const dealerData = dealersMap.get(dealerId) as IDealersMapValue;

            return this.populateDealerData(dealerId, dealerData, freeSlots);
        });
    }

    private buildDealerSlotsQuery(dealer: IDealerResponse, query: IBaseFreeSlotsRequest) {
        return {
            dealerId: dealer.agencyId,
            appointmentProvider: this.mapAppointmentEngines(dealer.appointmentEngine),
            channel: query.channel,
            quantity: query.quantity,
            fromDate: query.fromDate || moment().format(this.DATE_FORMAT),
            numberOfDays: query.numberOfDays || 7,
            services: query.services as string[] || [],
        };
    }

    private mapAppointmentEngines(engine?: APPOINTMENT_ENGINES) {
        switch (engine) {
            case APPOINTMENT_ENGINES.ZEITMECHANIK:
                return APPOINTMENT_PROVIDERS.ZEITMECHANIK;
            case APPOINTMENT_ENGINES.TIMEBLOCKR:
                return APPOINTMENT_PROVIDERS.TIMEBLOCKR;
            default:
                return APPOINTMENT_PROVIDERS.ZEITMECHANIK;
        }
    }

    static async getInstance() {
        return new AppointmentSlotsService();
    }
}
