import { AppointmentSlotsService } from './slots';
import { APPOINTMENT_ENGINES } from 'dealer-sdk';
import * as sinon from 'sinon';

const dealerMock = {
    invokeFindByLocation: sinon.stub().resolves({
        dealers: [{
            dealer: {
                agencyId: '30022307',
                name: 'name',
                address: {
                    city: 'City',
                },
                geoPoint: {
                    latitude: 1,
                    longitude: 1,
                },
                appointmentEngine: APPOINTMENT_ENGINES.ZEITMECHANIK,
            },
            distance: 10000,
        }],
    }),
    invokeGetById: sinon.stub().resolves({
        agencyId: '30022307',
        name: 'name',
        address: {
            city: 'City',
        },
        geoPoint: {
            latitude: 1,
            longitude: 1,
        },
        appointmentEngine: APPOINTMENT_ENGINES.ZEITMECHANIK,
    }),
};
const engineMock = {
    getFreeSlots: sinon.stub().resolves([
        {
            dealerId : '30022307',
            freeSlots : [{
                start: '2018-08-24T16:15:00',
                end: '2018-08-24T16:30:00',
            }],
        },
    ]),
};

describe('AppointmentSlotsService', () => {
    describe('getDealersByLocation()', () => {
        const instance: any = new AppointmentSlotsService();

        beforeAll(async () => {
            instance.dealer = dealerMock;
            await instance.getDealersByLocation({ latitude: 1, longitude: 1, distance: 10 });
        });

        it('Should request only installers', () => {
            const query = instance.dealer.invokeFindByLocation.getCall(0).args[0];

            expect(query).toEqual({
                latitude: 1,
                longitude: 1,
                distance: 10,
                installer: true,
                pageSize: 100000,
            });
        });
    });

    describe('populateTimeSlots()', () => {
        const instance: any = new AppointmentSlotsService();
        let mappedData: any;

        beforeAll(() => {
            mappedData = instance.populateTimeSlots([{
                start: '2018-08-24T16:15:00',
                end: '2018-08-24T16:30:00',
            }]);
        });

        it('Should transform time', () => {
            expect(mappedData[0]).toEqual({
                date: '2018-08-24',
                startSlot: '16:15:00',
                endSlot: '16:30:00',
            });
        });
    });

    describe('populateDealerFreeSlots()', () => {
        const instance: any = new AppointmentSlotsService();
        const dealerData = {
            distance: 10000,
            name: 'someName',
            address: 'someAddress',
            geoPoint: {
                latitude: 1,
                longitude: 1,
            },
        };

        let mappedData: any;

        beforeAll(() => {
            const dealerMap = new Map([['30022307', dealerData]]);
            const slots = [{
                dealerId: '30022307',
                freeSlots: [{
                    start: '2018-08-24T16:15:00',
                    end: '2018-08-24T16:30:00',
                }],
            }];

            mappedData = instance.populateDealerFreeSlots(dealerMap, slots);
        });

        it('Should map dealer data', () => {
            expect(mappedData[0]).toEqual({
                dealerId: '30022307',
                dealerName: dealerData.name,
                distance: dealerData.distance,
                address: dealerData.address,
                geoPoint: dealerData.geoPoint,
                timeSlot: [{
                    date: '2018-08-24',
                    startSlot: '16:15:00',
                    endSlot: '16:30:00',
                }],
            });
        });

        it('Should return empty array if no slots available', () => {
            const result = instance.populateDealerFreeSlots(new Map());

            expect(result).toEqual([]);
        });
    });

    describe('getFreeSlots()', () => {
        const instance: any = new AppointmentSlotsService();
        let slotsResponse: any;

        beforeAll(async () => {
            instance.dealer = dealerMock;
            instance.appointmentEngine = engineMock;

            slotsResponse = await instance.getFreeSlots({
                latitude: 1,
                longitude: 1,
                quantity: 1,
                distance: 10,
            });
        });

        it('Should return transformed response', () => {
            expect(slotsResponse[0]).toEqual({
                dealerId: '30022307',
                dealerName: 'name',
                address: { city: 'City' },
                geoPoint: {
                    latitude: 1,
                    longitude: 1,
                },
                timeSlot: [{
                    date: '2018-08-24',
                    startSlot: '16:15:00',
                    endSlot: '16:30:00',
                }],
                distance: 10000,

            });
        });

        it('Should return geoPoint', () => {
            expect(slotsResponse[0].geoPoint).toEqual({
                latitude: 1,
                longitude: 1,
            });
        });

        it('Should return geoPoint', () => {
            expect(slotsResponse[0].geoPoint).toEqual({
                latitude: 1,
                longitude: 1,
            });
        });
    });

    describe('getFreeSlotsByDealer()', () => {
        const instance: any = new AppointmentSlotsService();
        let slotsResponse: any;

        beforeAll(async () => {
            instance.dealer = dealerMock;
            instance.appointmentEngine = engineMock;

            slotsResponse = await instance.getFreeSlotsByDealer('30022307', { quantity: 1 });
        });

        it('Should return transformed response', () => {
            expect(slotsResponse).toEqual({
                dealerId: '30022307',
                dealerName: 'name',
                address: { city: 'City' },
                geoPoint: {
                    latitude: 1,
                    longitude: 1,
                },
                timeSlot: [{
                    date: '2018-08-24',
                    startSlot: '16:15:00',
                    endSlot: '16:30:00',
                }],
            });
        });

        it('Should return geoPoint', () => {
            expect(slotsResponse.geoPoint).toEqual({
                latitude: 1,
                longitude: 1,
            });
        });
    });

    describe('getInstance()', () => {
        it('Should return an instance', () => {
            return AppointmentSlotsService.getInstance().then((instance) => {
                expect(instance).toBeInstanceOf(AppointmentSlotsService);
            });

        });
    });
});
