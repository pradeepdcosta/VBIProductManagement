import { useNavigate } from 'react-router-dom';

export default function Topbar() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center px-5 h-[52px] bg-vf-dark text-white border-b-2 border-vf-red shrink-0 gap-4">
      <div className="text-[15px] font-semibold tracking-tight">
        Vodafone <span className="text-vf-red">Business</span>
      </div>
      <div className="text-xs text-[#aaa] font-normal ml-1">| VBI Product Intelligence Portal</div>
      <div className="ml-auto flex items-center gap-3">
        <span className="text-[11px] text-[#888]">VBI · FY27</span>
        <button
          onClick={() => navigate('/features')}
          className="bg-vf-red border border-vf-red text-white rounded-md px-3 py-1 text-xs cursor-pointer font-sans hover:bg-vf-red-hover"
        >
          + New Request
        </button>
        <div className="w-[30px] h-[30px] bg-vf-red rounded-full flex items-center justify-center text-xs font-semibold text-white cursor-pointer">
          P
        </div>
      </div>
    </div>
  );
}
