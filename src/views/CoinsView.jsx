
import FiltersBar from '../components/FiltersBar'
import CoinsTable from '../components/CoinsTable'
import useCoinStore from '../store/useCoinStore'

const CoinsView = () => {
  const { coins } = useCoinStore()

  return (
    <div className="flex flex-col h-full">
      <FiltersBar />
      <div className="flex-1 overflow-auto bg-card">
        <CoinsTable data={coins} />
      </div>
    </div>
  )
}

export default CoinsView
