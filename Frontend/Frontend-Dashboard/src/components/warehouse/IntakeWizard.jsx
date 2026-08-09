import { useState, useEffect, useContext } from 'react'
import { Steps, Button, Form, Result, Spin, App, theme } from 'antd'
import axios from 'axios'

import { UserContext } from '../../global/UserContext'
import PoSelectStep from './steps/PoSelectStep'
import CaSelectStep from './steps/CaSelectStep'
import DeliveryDetailsStep from './steps/DeliveryDetailsStep'
import ConfirmStep from './steps/ConfirmStep'
import { ITEM_DESCRIPTION } from '../../data/mockMasterData'

const STEPS = [
	{ title: 'Select PO',      description: 'Choose purchase order' },
	{ title: 'Select CA',      description: 'Choose collection advice' },
	{ title: 'Delivery Details', description: 'Enter receipt information' },
	{ title: 'Confirm',        description: 'Review & submit' },
]

function IntakeWizard() {
	const { token } = theme.useToken()
	const { message } = App.useApp()
	const { user } = useContext(UserContext)

	const [current, setCurrent]               = useState(0)
	const [selectedPo, setSelectedPo]         = useState(null)
	const [selectedCa, setSelectedCa]         = useState(null)
	const [deliveryDetails, setDeliveryDetails] = useState(null)
	const [submitted, setSubmitted]           = useState(false)
	const [posLoading, setPosLoading]         = useState(false)
	const [casLoading, setCasLoading]         = useState(false)
	const [submitting, setSubmitting]         = useState(false)
	const [pos, setPos]                       = useState([]) //???????????
	const [cas, setCas]                       = useState([])
	const [locations, setLocations]           = useState([])
	
	const [form] = Form.useForm()

	const fetchInitializationData = async () => {
		setPosLoading(true)
		try {
			const [poRes, locRes] = await Promise.all([
				axios.get('/api/orders/purchase'),
				axios.get('/api/referenceData/locations').catch(() => ({ data: [] }))
			])

			const normalizedPos = (poRes.data.purchase_orders || []).map(po => ({
				id: po.po_number,
				po_number: po.po_number,
				po_date: po.po_date,
				supplier: po.supplier_name || `Supplier ID Reference: ${po.supplier_id}`,
				material_code: po.item_code,
				material_name: ITEM_DESCRIPTION[po.item_code] || 'Fertilizer Material', 
				qty_mt: Number(po.ordered_qty_mt),
				balance_mt: Number(po.remaining_balance_mt),
				status: Number(po.remaining_balance_mt) <= 0 ? 'closed' : 'open'
			}))

			setPos(normalizedPos)
			
			const fetchedLocs = Array.isArray(locRes.data) ? locRes.data : (locRes.data?.locations || []);
			setLocations(fetchedLocs.length > 0 ? fetchedLocs : [
				{ id: 1, name: 'Jenjarom Internal Store', location_type: 'internal' },
				{ id: 2, name: 'YAL 3 Warehouse', location_type: 'external' },
				{ id: 3, name: 'YAL 5 Warehouse', location_type: 'external' }
			])
		} catch (error) {
			message.error('Failed to load active purchase orders from backend.')
		} finally {
			setPosLoading(false)
		}
	}

	useEffect(() => {
		fetchInitializationData()
	}, [])

	const handlePoSelect = async (po) => {
		setSelectedPo(po)
		setSelectedCa(null)
		setCasLoading(true)
		try {
			const res = await axios.get('/api/logistics/get_ca')
			
			const openDispatches = (res.data.trucking_registry || [])
				.filter((ca) => ca.po_number === po.po_number && ca.status === 'Dispatched')
				.map((ca, idx) => ({
					id: ca.hg_ca_number || idx,
					ca_number: ca.hg_ca_number,
					hg_ca_number: ca.hg_ca_number,
					ca_date: ca.ca_date,
					qty_mt: Number(ca.quantity_mt),
					lorry_number: ca.lorry_number,
					location: ca.pickup_location_name,
					supp_ca_ref: ca.supplier_ca_ref,
					driver_name: ca.driver_name,
					driver_ic: ca.driver_ic || ''
				}))
			
			setCas(openDispatches)
		} catch {
			message.error('Failed to look up collection advice dispatches for this purchase order.')
		} finally {
			setCasLoading(false)
		}
	}

	const handleNext = async () => {
		if (current === 0) {
			if (!selectedPo) { message.warning('Please select a Purchase Order first.'); return }
			setCurrent(1)
		} else if (current === 1) {
			if (!selectedCa) { message.warning('Please select a Collection Advice first.'); return }
			
			form.setFieldsValue({ 
				lorry_number: selectedCa.lorry_number || '',
				driver_name: selectedCa.driver_name || '',
				driver_ic: selectedCa.driver_ic || '',
				qty_mt: selectedCa.qty_mt
			})
			setCurrent(2)
		} else if (current === 2) {
			try {
				const values = await form.validateFields()
				setDeliveryDetails(values)
				setCurrent(3)
			} catch {
				// idk what to put here lmao lets hope it does not crash haha 
			}
		}
	}

	const handleBack = () => setCurrent((c) => Math.max(c - 1, 0))

	const handleSubmit = async () => {
		setSubmitting(true)
		try {
			await axios.post('/api/inventory/intake', {
				hg_ca_number: selectedCa.hg_ca_number,
				batch_code: deliveryDetails.batch_number || null,
				item_code: selectedPo.material_code,
				location_id: deliveryDetails.location_id,
				quantity_mt: deliveryDetails.qty_mt,
				remarks: deliveryDetails.notes || '',
				performed_by: user?.id || 1
			})
			setSubmitted(true)
		} catch (err) {
			message.error(err.response?.data?.error || 'Failed to record stock intake transaction.')
		} finally {
			setSubmitting(false)
		}
	}

	const handleReset = () => {
		setSubmitted(false)
		setCurrent(0)
		setSelectedPo(null)
		setSelectedCa(null)
		setDeliveryDetails(null)
		setCas([])
		form.resetFields()
		fetchInitializationData() // Clear out cache lists
	}

	if (submitted) {
		return (
			<Result
				status="success"
				title="Intake Record Submitted"
				subTitle={
					<span>
						<strong>{selectedPo?.material_code}</strong> · {deliveryDetails?.qty_mt} MT ·{' '}
						CA <strong className="font-mono">{selectedCa?.ca_number}</strong>
						<br />
						Material allocation saved. Inventory added to database storage metrics successfully.
					</span>
				}
				extra={[
					<Button type="primary" key="another" onClick={handleReset}>
						Submit Another Intake
					</Button>,
				]}
			/>
		)
	}

	return (
		<Spin spinning={submitting} tip="Processing stock transaction…">
			<div className="flex flex-col gap-6">
				<Steps
					current={current}
					items={STEPS}
					size="small"
					responsive
					style={{ marginBottom: 8 }}
				/>

				<div
					style={{
						background: token.colorBgContainer,
						border: `1px solid ${token.colorBorderSecondary}`,
						borderRadius: token.borderRadiusLG,
						padding: 24,
						minHeight: 300,
					}}
				>
					{current === 0 && (
						<PoSelectStep
							pos={pos}
							loading={posLoading}
							selectedPo={selectedPo}
							onSelect={handlePoSelect}
						/>
					)}
					{current === 1 && (
						<CaSelectStep
							cas={cas}
							loading={casLoading}
							selectedCa={selectedCa}
							onSelect={setSelectedCa}
						/>
					)}
					{current === 2 && (
						<DeliveryDetailsStep
							form={form}
							selectedCa={selectedCa}
							locations={locations}
						/>
					)}
					{current === 3 && (
						<ConfirmStep
							selectedPo={selectedPo}
							selectedCa={selectedCa}
							deliveryDetails={deliveryDetails}
							locations={locations}
						/>
					)}
				</div>

				<div className="flex justify-between">
					<Button onClick={handleBack} disabled={current === 0} size="large">
						Back
					</Button>

					{current < 3 ? (
						<Button type="primary" onClick={handleNext} size="large">
							Next
						</Button>
					) : (
						<Button
							type="primary"
							onClick={handleSubmit}
							loading={submitting}
							size="large"
							style={{ minWidth: 140 }}
						>
							Submit Intake
						</Button>
					)}
				</div>
			</div>
		</Spin>
	)
}

export default IntakeWizard